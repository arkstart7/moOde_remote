/**
 * @file albumArtService.ts
 *
 * @description
 * Единая точка загрузки обложек альбомов.
 *
 * Обложки берутся напрямую из MPD:
 *
 *     albumart <uri>       — файл-обложка рядом с треком;
 *     readpicture <uri> 0  — встроенная обложка аудиофайла.
 *
 * Представителем альбома является его первый трек: путь трека
 * берется из LibraryStore, и по нему запрашивается обложка.
 *
 * Загруженные байты сохраняются в кэш-каталог приложения
 * (CachesDirectoryPath/album-art) под именем {artist}_{title}.jpg,
 * дальше используется обычный file:// URI: нативный слой сам читает
 * файл с диска и кэширует декодированные изображения. Кэш переживает
 * перезапуск приложения и чистится системой, а при повторных
 * запусках сетевые запросы не нужны.
 *
 * Пути к обложкам дополнительно кэшируются в памяти для
 * синхронного доступа; строки путей маленькие, поэтому
 * лимит размера не нужен.
 *
 * Каталог файлового кэша версионирован (album-art-v3): предыдущие
 * версии могли сохранить обложки, скачанные с неверным
 * соответствием альбомов, поэтому старые каталоги игнорируются
 * и удаляются при первом обращении.
 */

import {
    exists,
    mkdir,
    unlink,
    writeFile,
    CachesDirectoryPath,
} from 'react-native-fs';

import { libraryStore } from '../library/LibraryStore';

import { bytesToBase64, fetchMpdArtwork } from './mpd/mpdArtworkService';

/** Каталог файлового кэша обложек внутри приложения. */
const CACHE_DIR = `${CachesDirectoryPath}/album-art-v3`;

/**
 * Каталоги кэша предыдущих версий: могли содержать обложки,
 * скачанные с неверным соответствием альбомов.
 */
const LEGACY_CACHE_DIRS = [
    `${CachesDirectoryPath}/album-art`,
    `${CachesDirectoryPath}/album-art-v2`,
];

/** Число параллельных загрузок при прогреве списка. */
const LOAD_CONCURRENCY = 4;

/**
 * Контекст загрузки обложек: путь трека-представителя
 * для каждого альбома.
 */
interface ArtworkContext {
    pathByAlbumId: Map<string, string>;
}

export class AlbumArtService {
    /**
     * Кэш путей к обложкам: ID альбома → file:// URI.
     */
    private cache = new Map<string, string>();

    /**
     * Альбомы, для которых загрузка не удалась в этой сессии
     * (например, MPD закрывает соединение на данном файле):
     * прогрев их не повторяет, но точечный getAlbumImage,
     * вызванный из UI, попытку все же делает.
     */
    private failedAlbums = new Set<string>();

    /**
     * Признак того, что каталог кэша уже создан:
     * повторные mkdir при параллельных загрузках не нужны.
     */
    private cacheDirReady = false;

    /**
     * Лениво инициализируемый контекст загрузки.
     *
     * При ошибке сбрасывается, чтобы следующее обращение
     * попробовало снова.
     */
    private contextPromise: Promise<ArtworkContext> | null = null;

    /**
     * Возвращает обложку из кэша памяти, если она там есть.
     */
    getCached(albumId: string): string | undefined {
        return this.cache.get(albumId);
    }

    /**
     * Загружает обложку альбома.
     *
     * Возвращает null, если обложки нет или её
     * не удалось загрузить. Метод не отклоняется:
     * отсутствие картинки — нормальная ситуация.
     */
    async getAlbumImage(albumId: string): Promise<string | null> {
        const cached = this.getCached(albumId);

        if (cached) {
            return cached;
        }

        const album = libraryStore.getAlbum(albumId);

        if (!album) {
            return null;
        }

        try {
            const fileName = buildImageFileName(album.artist, album.title);

            /*
             * Дисковый кэш проверяем до инициализации контекста:
             * закэшированные обложки доступны без сети.
             */
            const diskUri = await this.getCachedFileUri(fileName);

            if (diskUri) {
                this.cache.set(albumId, diskUri);

                return diskUri;
            }

            const context = await this.getArtworkContext();

            return await this.loadImage(context, album.id);
        } catch (error) {
            console.error('Failed to load album image:', album.id, error);

            return null;
        }
    }

    /**
     * Прогревает кэш для списка альбомов.
     *
     * Загрузка выполняется пулом из нескольких воркеров,
     * каждая готовая обложка сразу отдается в onImage,
     * чтобы список обновлялся постепенно.
     */
    async warmup(
        albumIds: string[],
        onImage?: (albumId: string, imageUri: string) => void,
    ): Promise<void> {
        const pendingIds = albumIds.filter(
            id => !this.cache.has(id) && !this.failedAlbums.has(id),
        );

        if (pendingIds.length === 0) {
            return;
        }

        let context: ArtworkContext;

        try {
            context = await this.getArtworkContext();
        } catch (error) {
            console.error('Failed to prepare artwork playlist:', error);

            return;
        }

        let nextIndex = 0;

        const loadNext = async (): Promise<void> => {
            while (nextIndex < pendingIds.length) {
                const albumId = pendingIds[nextIndex];
                nextIndex += 1;

                try {
                    const imageUri = await this.loadImage(context, albumId);

                    if (imageUri) {
                        onImage?.(albumId, imageUri);
                    }
                } catch (error) {
                    /*
                     * MPD может закрыть соединение посреди прогрева
                     * (рестарт сервиса, таймаут, лимит подключений).
                     * Следующая команда откроет соединение заново,
                     * поэтому одну повторную попытку делаем здесь;
                     * диагностический лог оставляем только для
                     * повторного провала.
                     */
                    try {
                        const retryUri = await this.loadImage(context, albumId);

                        if (retryUri) {
                            onImage?.(albumId, retryUri);
                        }
                    } catch (retryError) {
                        /*
                         * Неустранимая для этого альбома ситуация:
                         * MPD стабильно закрывает соединение на данном
                         * файле. Запоминаем альбом, чтобы не повторять
                         * заведомо провальные запросы на каждом прогреве,
                         * и diagnostics на уровне warn, а не error,
                         * чтобы не поднимать LogBox.
                         */
                        this.failedAlbums.add(albumId);

                        console.warn(
                            'Failed to read album image:',
                            albumId,
                            error,
                            retryError,
                        );
                    }
                }
            }
        };

        const workerCount = Math.min(LOAD_CONCURRENCY, pendingIds.length);

        await Promise.all(
            Array.from({ length: workerCount }, () => loadNext()),
        );
    }

    /**
     * Загружает одну обложку с дискового кэша или сервера
     * и кладет результат в кэш памяти.
     *
     * Возвращает null, если обложки нет.
     */
    private async loadImage(
        context: ArtworkContext,
        albumId: string,
    ): Promise<string | null> {
        const cached = this.getCached(albumId);

        if (cached) {
            return cached;
        }

        const album = libraryStore.getAlbum(albumId);

        if (!album) {
            return null;
        }

        const fileName = buildImageFileName(album.artist, album.title);

        const diskUri = await this.getCachedFileUri(fileName);

        if (diskUri) {
            this.cache.set(albumId, diskUri);

            this.failedAlbums.delete(albumId);

            return diskUri;
        }

        const trackPath = context.pathByAlbumId.get(album.id);

        if (!trackPath) {
            return null;
        }

        const bytes = await fetchMpdArtwork(trackPath);

        if (!bytes || bytes.length === 0) {
            return null;
        }

        const base64 = bytesToBase64(bytes);

        const imageUri = await this.writeCachedImage(fileName, base64);

        this.cache.set(albumId, imageUri);

        return imageUri;
    }

    /**
     * Возвращает file:// URI обложки в кэше приложения
     * или null, если файла еще нет.
     */
    private async getCachedFileUri(fileName: string): Promise<string | null> {
        await this.ensureCacheDir();

        const cachePath = `${CACHE_DIR}/${fileName}`;

        if (await exists(cachePath)) {
            return `file://${cachePath}`;
        }

        return null;
    }

    /**
     * Записывает загруженную обложку в кэш приложения.
     *
     * При неудачной записи возвращается data URI,
     * чтобы обложка все равно отобразилась.
     */
    private async writeCachedImage(
        fileName: string,
        base64: string,
    ): Promise<string> {
        await this.ensureCacheDir();

        const cachePath = `${CACHE_DIR}/${fileName}`;

        try {
            await writeFile(cachePath, base64, 'base64');
        } catch (error) {
            console.error(
                'Failed to write cached album image:',
                fileName,
                error,
            );

            return `data:image/jpeg;base64,${base64}`;
        }

        return `file://${cachePath}`;
    }

    /**
     * Создает каталог кэша, если его еще нет.
     */
    private async ensureCacheDir(): Promise<void> {
        if (this.cacheDirReady) {
            return;
        }

        await removeLegacyCacheDirs();

        if (!(await exists(CACHE_DIR))) {
            try {
                await mkdir(CACHE_DIR);
            } catch (error) {
                /*
                 * Каталог мог создать параллельный воркер:
                 * ошибка важна только если его действительно нет.
                 */
                if (!(await exists(CACHE_DIR))) {
                    throw error;
                }
            }
        }

        this.cacheDirReady = true;
    }

    /**
     * Возвращает контекст загрузки, инициализируя его лениво.
     */
    private getArtworkContext(): Promise<ArtworkContext> {
        if (!this.contextPromise) {
            this.contextPromise = buildArtworkContext().catch(error => {
                this.contextPromise = null;

                throw error;
            });
        }

        return this.contextPromise;
    }
}

/**
 * Строит контекст загрузки обложек.
 *
 * Представителем альбома является его первый трек: путь трека
 * уже хранится в Library, отдельное чтение каталога не нужно.
 */
async function buildArtworkContext(): Promise<ArtworkContext> {
    const pathByAlbumId = new Map<string, string>();

    for (const album of libraryStore.getAllAlbums()) {
        const firstTrackId = album.trackIds[0];

        if (!firstTrackId) {
            continue;
        }

        const track = libraryStore.getTrack(firstTrackId);

        if (track?.path) {
            pathByAlbumId.set(album.id, track.path);
        }
    }

    return { pathByAlbumId };
}

/**
 * Имя файла обложки для альбома.
 *
 * Символы, недопустимые в именах файлов Android (двоеточие,
 * слэши и так далее), заменяются на подчеркивание: без этого
 * запись кэша падает с ENOENT.
 */
function buildImageFileName(artist: string, title: string): string {
    const base = `${sanitizeFileNamePart(artist)}_${sanitizeFileNamePart(
        title,
    )}`;

    return `${base || 'album'}.jpg`;
}

/**
 * Заменяет недопустимые в именах файлов Android символы.
 */
function sanitizeFileNamePart(value: string): string {
    return value.replace(/[/\\:*?"<>|]/g, '_').trim();
}

/**
 * Единственный экземпляр AlbumArtService.
 */
export const albumArtService = new AlbumArtService();

/**
 * Удаляет каталоги кэша предыдущих версий.
 *
 * Файлы из старых каталогов могли быть записаны, когда служебный
 * playlist соответствовал другому порядку альбомов, поэтому им
 * нельзя доверять. Ошибка удаления не критична: каталог
 * игнорируется, а систему очистит кэш сама.
 */
async function removeLegacyCacheDirs(): Promise<void> {
    for (const dir of LEGACY_CACHE_DIRS) {
        try {
            if (await exists(dir)) {
                await unlink(dir);
            }
        } catch (error) {
            console.error('Failed to remove legacy album art cache:', error);
        }
    }
}
