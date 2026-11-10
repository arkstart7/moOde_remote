# AGENTS.md

Guidance for coding agents working in FoobarRemote, a React Native 0.86
application written in TypeScript for controlling Foobar2000 through Beefweb.

## Repository Map

-   `App.tsx` is the application entry point.
-   `src/screens/` contains screen components and screen-level behavior.
-   `src/components/` contains reusable UI, controls, icons, and barrel exports.
-   `src/navigation/` contains the native stack navigator.
-   `src/services/` contains I/O, API, settings, playback, and loading logic.
-   `src/library/` contains library domain types, storage, import, and indexing.
-   `src/theme/` contains shared colors and typography.
-   `src/types/` contains shared TypeScript types, including navigation params.
-   `__tests__/` contains Jest tests; native projects are in `android/` and `ios/`.

## Environment and Installation

-   Use Node `>= 22.11.0`, as required by `package.json`.
-   Install JavaScript dependencies with `npm install`.
-   Keep `package-lock.json` consistent with `package.json`.
-   For iOS setup, run `bundle install` once when needed.
-   After native dependency changes, run `bundle exec pod install`.
-   Android and iOS builds require the corresponding SDKs, emulator/simulator,
    and React Native environment setup described in `README.md`.

## Build and Run Commands

There is no generic `build` npm script. Use the platform scripts or native
tooling when a build artifact is required.

```sh
npm start                 # Start the Metro bundler
npm run android           # Build, install, and run Android
npm run ios               # Build, install, and run iOS
cd android && ./gradlew assembleDebug  # Android debug artifact
cd android && ./gradlew test           # Android unit tests, if present
```

Run Metro in a separate terminal before `npm run android` or `npm run ios`.
Use `npx react-native start --reset-cache` only when diagnosing stale Metro
state; do not make cache resets part of routine verification.

## Lint, Types, and Formatting

```sh
npm run lint              # Equivalent to: eslint .
npx eslint path/to/file.tsx
npx tsc --noEmit          # Typecheck; there is no package script for this
npx prettier --check .    # Check formatting
npx prettier --write path/to/file.tsx
```

-   ESLint extends `@react-native` via `.eslintrc.js`.
-   The default `no-bitwise` rule allows `^`, `>>>`, `^=`, and `|`.
-   `BeefwebWaveformSlider.tsx` disables `no-bitwise` because its waveform
    processing needs bitwise operations.
-   Run lint and typecheck for source changes; format only the files you touch.
-   Do not add a new lint, format, or build script without a clear need.

## Tests

```sh
npm test                         # Run the complete Jest suite
npx jest --runInBand             # Run the suite serially
npx jest __tests__/App.test.tsx  # Run one test file
npx jest path/to/example.test.tsx
npx jest -t "renders correctly"   # Run tests matching a name
npx jest __tests__/App.test.tsx -t "renders correctly"
npx jest --watch                  # Interactive watch mode
```

-   Jest uses `@react-native/jest-preset` from `jest.config.js`.
-   Test files should use `.test.ts` or `.test.tsx` and live under `__tests__/`
    unless a colocated test is needed for a component.
-   Prefer focused tests for changed behavior, then run the full suite when
    practical. `--runInBand` can make React Native failures easier to diagnose.
-   The existing test uses `react-test-renderer` and wraps rendering in
    `ReactTestRenderer.act(...)`; follow that pattern for renderer tests.
-   Tests may need mocks for native modules, filesystem access, or AsyncStorage.

## TypeScript and Imports

-   Use TypeScript for all new application code; do not add `.js` or `.jsx`.
-   `tsconfig.json` extends `@react-native/typescript-config`, includes all
    `.ts`/`.tsx` files, and supplies Jest types.
-   Prefer `interface` for extensible object shapes and `type` for unions,
    tuples, and aliases.
-   Type component props explicitly with `Props` or `<ComponentName>Props`.
-   Avoid `React.FC` unless an existing local pattern requires it.
-   Do not use `as any`; use a precise type, `unknown`, or a type guard.
-   Keep imports grouped: React/React Native, third-party packages, then local
    relative modules, with blank lines between groups.
-   Use relative local imports; this repository has no configured path alias.
-   Prefer named imports for utilities, hooks, and services; components generally
    use default exports, with barrel files re-exporting public components.
-   Use one import per declaration and avoid namespace imports for local code.

## Formatting

-   Follow `.prettierrc.js`: single quotes, semicolons, trailing commas, four
    spaces, no tabs, and omitted arrow-function parentheses where valid.
-   Match surrounding indentation in older files that still use two spaces; do
    not reformat an unrelated file wholesale.
-   Keep JSX readable: split long prop lists and use one prop per line when the
    element becomes difficult to scan.
-   Preserve the established React Native style object approach and colocate
    styles with their component unless a shared theme value is appropriate.
-   Keep lines and expressions simple; extract named helpers rather than deeply
    nesting callbacks or conditional JSX.

## Naming and Organization

-   Use PascalCase for components, screens, classes, interfaces, and types.
-   Use camelCase for functions, variables, hooks, methods, and service files.
-   Use UPPER_SNAKE_CASE for module constants such as `SETTINGS_KEY`.
-   Name component and screen files `PascalCase.tsx`; name services and utilities
    `camelCase.ts`.
-   Keep code in the established feature folders rather than adding arbitrary
    top-level directories.
-   Add new public screens/components to `src/screens/index.ts` or
    `src/components/index.ts` when that barrel is used by the consumer.
-   Add navigable screens to `RootStackParamList` in `src/types/navigation.ts`.
-   Use `useNavigation<NativeStackNavigationProp<RootStackParamList>>()` for
    typed navigation, following existing components.

## React and State Patterns

-   Keep transient UI state in React hooks; shared library state uses the existing
    singleton store pattern rather than introducing Redux or another store.
-   Wrap event handlers passed to children in `useCallback` when stability is
    relevant; use `useMemo` for expensive derived values, not trivial literals.
-   Use `useRef` for mutable values that must not trigger a render.
-   Cancel asynchronous effects on unmount with a cancellation flag or equivalent
    cleanup, and avoid setting state after cancellation.
-   Preserve existing navigation, theme, and component APIs unless the change
    specifically requires an intentional breaking change.

## Errors, I/O, and Data

-   Wrap fallible `fetch`, AsyncStorage, filesystem, and SAF operations in
    `try/catch` and include useful context in `console.error` diagnostics.
-   Return a documented safe fallback where recovery is valid; otherwise rethrow
    a domain-specific error so callers can handle the failure.
-   Custom errors should extend `Error` and set a meaningful `name`.
-   Validate external JSON and settings before using them; treat parsed input as
    `unknown` until it has been narrowed.
-   Keep validation messages human-readable and use the existing `{ errors }`
    result pattern for validation flows.
-   Clamp numeric UI values with finite-number checks and explicit bounds.
-   Never log credentials, tokens, or private user data.

## UI and Accessibility

-   Add `accessibilityRole` and `accessibilityLabel` to interactive controls,
    especially `Pressable` elements.
-   Add `hitSlop` to small touch targets when it improves usability.
-   Reuse theme colors and typography; avoid introducing one-off visual constants.
-   Preserve mobile layouts and test changed screens on narrow dimensions when
    possible.

## Change Discipline

-   Read nearby code and existing tests before changing an established pattern.
-   Keep changes focused; do not rewrite unrelated files or generated native
    output (`android/build`, `ios/build`, Pods) manually.
-   Do not add dependencies unless the task requires them and the existing stack
    cannot solve the problem.
-   Preserve existing comments and file-level documentation; add comments only
    to explain non-obvious rationale.
-   Before handing off, run the narrowest relevant test, `npx tsc --noEmit`, and
    `npm run lint` when applicable.
-   Do not commit, amend, push, or reset changes unless explicitly requested.

## Editor Instructions

No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` files
are present in this repository. If any are added later, treat them as
repository instructions and update this document when their guidance changes.
