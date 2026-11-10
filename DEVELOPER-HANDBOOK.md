# Справочник разработчика FoobarRemote

Внутреннее устройство приложения: архитектура, поток запуска, ключевые
модули, паттерны состояния и типовые задачи. Конвенции оформления кода
вынесены в [AGENTS.md](AGENTS.md); здесь они не дублируются.

## Архитектура

Приложение построено без внешних стейт-менеджеров. Слои:

```text
Экраны (src/screens) и компоненты (src/components)
        │  useSyncExternalStore + вызовы действий
        ▼
Синглтоны состояния: libraryStore, playbackController
        │  вызовы функций
        ▼
Сервисы (src/services): API Beefweb, настройки, импорт
        │  fetch с таймаутом
        ▼
HTTP API Beefweb / AsyncStorage / файловая система
```

Ключевые решения:

-   **Синглтоны вместо React Context.** `libraryStore` и `playbackController`
    — обычные экземпляры классов на уровне модулей. Они переживают смену
    экранов, не вызывают лишних ре-рендеров и тестируются изолированно.
-   **Подписка через версию.** Оба стора реализуют пару
    `subscribe(listener)` / `getSnapshot()`, где snapshot — просто счетчик
    `version`, увеличивающийся в `notify()`. Компоненты подключают его через
    `useSyncExternalStore`, поэтому перерисовка происходит только при явном
    уведомлении.
-   **Опрос по требованию.** Цикл опроса состояния плеера (раз в секунду)
    запускается методом `playbackController.acquirePolling()` из
    `useFocusEffect` каждого экрана с элементами управления. Счетчик
    потребителей гарантирует ровно один цикл независимо от глубины стека.
-   **Ошибки как данные.** Сервисы бросают `LocalizedError` c кодом
    `err.*`; экраны форматируют их через `formatError(error, t)` на текущем
    языке.

## Поток запуска

`App.tsx` загружает язык и монтирует `RootNavigator`, чей начальный маршрут
— `Start`.

```text
StartScreen (useFocusEffect)
    1. loadSettings()          → нет настроек?  → Settings(fromStart=true)
    2. validateSettings()      → ошибки?        → Settings(errors, fromStart=true)
    3. loadLibrary(url)        чтение каталога, импорт, восстановление CurrentPlayback
    4. loadCurrentAlbumToBeefwebPlaylist(url)
    5. navigation.replace('Albums')
```

Любое исключение на шагах 3–5 уходит в `Settings` списком ошибок. Экран
`Settings` работает в двух режимах (см. `SettingsScreen.tsx`):

-   **fromStart** — форма не сохраняется сама; проверка и сохранение
    происходят при нажатии Back, затем `Settings` заменяет себя на `Start`
    (`navigation.replace('Start')`), и запуск повторяется;
-   **обычный** (открыт из NavigationBar) — измененные поля проверяются и
    сохраняются при выходе; библиотека здесь не перечитывается.

## Ключевые модули

### src/library

| Файл                 | Назначение                                                                                                                                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`           | Доменная модель: `Library`, жанр → исполнители/альбомы, альбом → диски → треки                                                                                                                                                                                                |
| `LibraryImporter.ts` | Чистая функция `importLibrary(FoobarTrack[]): Library`. Правила: первое значение многозначных тегов, `album artist` → fallback `artist`, отсутствующий `genre` → `"?"`, диск/всего дисков → 1; ID альбома = `album artist\|album`; сортировка по discnumber затем tracknumber |
| `LibraryStore.ts`    | Синглтон: хранит `Library`, выбор жанра/исполнителя, `CurrentPlayback` (альбом, трек, позиция). Методы-селекторы (`getSelectedAlbums`, `getTracks`…) возвращают новые массивы только при изменении данных                                                                     |

Идентификатор трека — `${path}#${subsong_index}`; так как каталог всегда
дает `subsong_index = 0`, один трек обязан быть отдельным файлом.

### src/services

| Файл                        | Назначение                                                                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settingsService.ts`        | Чтение/запись настроек в AsyncStorage с кэшем в памяти (цикл опроса читает их каждую секунду)                                                                                                             |
| `settingsValidator.ts`      | Проверка настроек соединением с сервером; результат `{ errors }`                                                                                                                                          |
| `beefwebUrl.ts`             | Нормализация адреса: протокол по умолчанию `http://`, порт 1–65535, поддержка IPv6                                                                                                                        |
| `fetchWithTimeout.ts`       | `fetch` с таймаутом (по умолчанию 5000 мс)                                                                                                                                                                |
| `beefwebCatalogService.ts`  | Плейлист-каталог `beefweb-catalog`: поиск ID, постраничное чтение (1000 строк за запрос, максимум 100 000), контракт колонок `%path%` + `$meta(...)`, пути строк для обложек                              |
| `beefwebPlaylistService.ts` | Игровой плейлист `beefweb`: создать при отсутствии, очистить, залить треки выбранного альбома                                                                                                             |
| `tracklistService.ts`       | Экран плейлистов: `GET /api/playlists`, исключение служебных (Default, beefweb, beefweb-catalog) и пустых плейлистов, постраничное чтение строк выбранного плейлиста                                      |
| `beefwebPlayerService.ts`   | Снапшот плеера, команды play/pause/stop, громкость и mute, преобразования процентов                                                                                                                       |
| `beefwebArtworkService.ts`  | `GET /api/artwork/{playlistId}/{itemIndex}`; 404 — норма (обложки нет), ответ кодируется в base64                                                                                                         |
| `albumArtService.ts`        | Единая точка обложек: соответствие «альбом → индекс элемента» строится по путям первого трека среди строк каталога; дисковый кэш `album-art-v3` в CachesDirectoryPath, прогрев списка пулом из 4 воркеров |
| `LibraryLoader.ts`          | Конвейер импорта: каталог → `importLibrary` → `libraryStore.setLibrary` → восстановление `CurrentPlayback`                                                                                                |
| `playbackInitializer.ts`    | Валидация и восстановление сохраненного `CurrentPlayback`, иначе первый альбом/трек                                                                                                                       |
| `playbackController.ts`     | Владелец цикла опроса и команд: playPause, selectTrack, selectAlbum, seek, громкость с preview/commit, mute; оптимистичная позиция после seek/play игнорирует сервер 2 секунды (допуск ±1 с)              |
| `playbackSyncService.ts`    | `syncPlaybackSnapshot`: перенос активного индекса и позиции с сервера в `LibraryStore`, возвращает признак автопереключения трека                                                                         |
| `playbackService.ts`        | Персистентность `CurrentPlayback` в AsyncStorage                                                                                                                                                          |

## Паттерны для новых фич

### Добавить команду плеера

1. Добавьте функцию в `beefwebPlayerService.ts`: принимает `beefwebUrl`,
   использует `fetchWithTimeout`, бросает `LocalizedError`.
2. Добавьте метод в `PlaybackController`: выставьте `pending`, обновите
   оптимистичное состояние, вызовите сервис, обработайте откат при ошибке,
   завершите `notify()`.
3. Подключите метод к кнопке экрана; подписку на состояние добавлять не
   нужно, если экран уже вызывает `useSyncExternalStore`.

### Добавить экран

1. Создайте `src/screens/<Name>Screen.tsx` (default export).
2. Добавьте маршрут в `RootStackParamList` (`src/types/navigation.ts`).
3. Если экрану нужен пункт нижнего меню — расширьте union типа `active`
   в `NavigationBar.tsx`.
4. Экспортируйте экран из `src/screens/index.ts`, если он используется
   извне баррела.

### Добавить строку интерфейса

1. Добавьте ключ в `src/i18n/translations/en.ts` — он является источником
   типов `TranslationKey`/`TranslationParams`.
2. Добавьте перевод во все словари — `ru.ts`, `de.ts`, `fr.ts`, `es.ts`,
   `zh.ts` (тип `TranslationDictionary` не даст забыть ни один файл).
3. Используйте `t('ключ')` или, для параметров, `t('ключ', { name })`.

### Добавить ошибку сервиса

Код ошибки начинается с префикса домена: `err.catalog.*`, `err.playlist.*`,
`err.player.*` и т.д. Бросайте `new LocalizedError(code, params)`; для HTTP
статусов — `toHttpLocalizedError(baseOperation, status, details)`, чтобы
пользователь получил отдельное сообщение для 401/404/5xx. Ключ обязательно
добавляется в оба файла переводов.

## i18n

-   `useTranslation()` подписан на смену языка через
    `useSyncExternalStore` — все экраны перерисовываются автоматически.
-   Язык загружается при старте в `App.tsx` (`loadLanguage`), до загрузки
    действует `DEFAULT_LANGUAGE: 'en'`.
-   `formatError(error, t)` — форматирование `ErrorDescriptor`;
    `describeError(unknown)` — приведение пойманного исключения
    к дескриптору.

## Навигация

Стек `RootNavigator` содержит маршруты `Start`, `Main`, `Genres`,
`Artists`, `Albums`, `Playlist`, `Tracks`, `Settings`
(см. `src/types/navigation.ts`).

Правила переходов:

-   `Start → Albums` — только `replace()`: стартовый экран не должен
    оставаться в стеке; `Main` открывается тапом по мини-плееру;
-   `Start → Settings` — `navigate()` с `fromStart: true`, чтобы Back из
    настроек вернул управление запуску;
-   пункты NavigationBar используют `navigate()`, поэтому экраны библиотеки
    накапливаются в стеке, а выбор жанра/исполнителя живет в
    `LibraryStore`, а не в параметрах маршрута.

## Тема

Цвета — `src/theme/colors.ts`, типографика — `src/theme/typography.ts`.
Новые визуальные константы в компонентах не вводятся: сначала проверьте
тему. Стили colocated со своим компонентом через `StyleSheet.create`.

Режим темы (системная/светлая/темная) хранится в `themeService.ts` —
по тому же паттерну, что и i18nService: значение кэшируется в модуле,
сервис реализует `subscribe()/getThemeMode()/getResolvedTheme()` для
`useSyncExternalStore`. Компоненты читают палитру через `useTheme()`,
а для `StatusBar` используют `useResolvedTheme()` (светлая — темные
иконки, темная — светлые).

## Тестирование

Тесты лежат в `__tests__/` (`*.test.ts[x]`), пресет `@react-native/jest-preset`,
глобальные моки — `jest.setup.ts`.

```sh
npm test                         # весь набор
npx jest --runInBand             # последовательно — проще диагностировать RN-падения
npx jest __tests__/App.test.tsx -t "renders correctly"
```

Рендерные тесты пишутся на `react-test-renderer` с оберткой
`ReactTestRenderer.act(...)` — образец см. в существующих тестах. Для
тестов сервисов подменяйте `globalThis.fetch` и мокайте `AsyncStorage`.

## Отладка

-   Все падения I/O логируются через `console.error` с контекстом —
    начинайте поиск с вывода Metro.
-   Если обложки пропали после правки каталога, а библиотека осталась старой,
    ожидаемо сработает `err.artwork.catalogMismatch`: обновите каталог
    и перезапустите приложение (импорт выполняется на `StartScreen`).
-   Зависшее состояние Metro лечится `npx react-native start --reset-cache`
    (только для диагностики, не routinely).

## Чек-лист перед передачей изменений

```sh
npm run lint
npm run typecheck
npm test
npx prettier --write <измененные файлы>
```

Полезно также проверить затронутый экран на узком устройстве и убедиться,
что отмена асинхронных эффектов (флаг `cancelled` в cleanup) не нарушена.
