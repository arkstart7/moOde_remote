/**
 * @file albumArtService.ts
 *
 * @description
 * Единая точка загрузки обложек альбомов.
 *
 * Обложки берутся с сервера Beefweb через artwork API:
 *
 *     GET /api/artwork/{playlistId}/{itemIndex}
 *
 * В качестве плейлиста используется общий каталог
 * "beefweb-catalog", содержащий все треки библиотеки
 * (см. beefwebCatalogService). Соответствие
 * "альбом → индекс элемента" строится по путям строк каталога:
 * представителем альбома является его первый трек, путь которого
 * ищется среди прочитанных путей. Оба значения берутся из одного
 * источника (%path% плейлиста), поэтому совпадают буквально,
 * без нормализации строк.
 *
 * Каталог только читается и не принадлежит ни одному устройству,
 * поэтому несколько клиентов, разделяющих один сервер, не
 * конкурируют за него; отдельные служебные плейлисты обложек
 * больше не нужны.
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

import { fetchBeefwebArtworkBase64 } from './beefwebArtworkService';

import { readBeefwebCatalogPaths } from './beefwebCatalogService';

import { resolveBeefwebUrl } from './beefwebUrl';

import { LocalizedError } from '../i18n';

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
 * Контекст загрузки обложек: URL сервера, служебный playlist
 * и индекс элемента для каждого альбома.
 */
interface ArtworkContext {
    beefwebUrl: string;
    playlistId: string | number;
    itemIndexByAlbumId: Map<string, number>;
}

export class AlbumArtService {
    /**
     * Кэш путей к обложкам: ID альбома → file:// URI.
     */
    private cache = new Map<string, string>();

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
        const pendingIds = albumIds.filter(id => !this.cache.has(id));

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
                    console.error(
                        'Failed to read album image:',
                        albumId,
                        error,
                    );
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

            return diskUri;
        }

        const itemIndex = context.itemIndexByAlbumId.get(album.id);

        if (itemIndex === undefined) {
            return null;
        }

        const base64 = await fetchBeefwebArtworkBase64(
            context.beefwebUrl,
            context.playlistId,
            itemIndex,
        );

        if (!base64) {
            return null;
        }

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
 * Позиции элементов берутся из фактического содержимого каталога:
 * путь первого трека каждого альбома ищется среди путей строк
 * плейлиса "beefweb-catalog". При дублях пути используется первое
 * вхождение.
 */
async function buildArtworkContext(): Promise<ArtworkContext> {
    const beefwebUrl = await resolveBeefwebUrl();

    const { playlistId, paths } = await readBeefwebCatalogPaths(beefwebUrl);

    const itemIndexByPath = new Map<string, number>();

    paths.forEach((path, index) => {
        if (!itemIndexByPath.has(path)) {
            itemIndexByPath.set(path, index);
        }
    });

    const itemIndexByAlbumId = new Map<string, number>();

    for (const album of libraryStore.getAllAlbums()) {
        const firstTrackId = album.trackIds[0];

        if (!firstTrackId) {
            continue;
        }

        const track = libraryStore.getTrack(firstTrackId);

        if (!track?.path) {
            continue;
        }

        const itemIndex = itemIndexByPath.get(track.path);

        if (itemIndex !== undefined) {
            itemIndexByAlbumId.set(album.id, itemIndex);
        }
    }

    /*
     * Ни один альбом не найден в каталоге при непустой библиотеке:
     * содержимое каталога на сервере разошлось с прочитанной
     * Library. Молча отдавать отсутствие обложек нельзя —
     * сообщаем о необходимости обновить каталог.
     */
    if (
        itemIndexByAlbumId.size === 0 &&
        libraryStore.getAllAlbums().length > 0
    ) {
        throw new LocalizedError('err.artwork.catalogMismatch');
    }

    return { beefwebUrl, playlistId, itemIndexByAlbumId };
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
