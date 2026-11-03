# Local build safeguards

`plugins/withWindowsCmake.js` keeps CMake output outside long OneDrive paths and supplies a two-job compilation/link pool. Gradle's `--max-workers 1` alone did not limit the number of Ninja compiler processes observed in the first x86_64 build. The interrupted build keeps its object cache; no user files were deleted.

The pool uses documented [CMAKE_JOB_POOL_COMPILE](https://cmake.org/cmake/help/v3.22/variable/CMAKE_JOB_POOL_COMPILE.html) and [JOB_POOLS](https://cmake.org/cmake/help/v3.22/prop_gbl/JOB_POOLS.html) behavior. This bounds concurrency; no end-to-end speedup benchmark is claimed.

Metro configuration retains Expo's default exclusions, particularly generated `.expo` directories, and adds narrowly scoped native output, export and artifact exclusions. Do not ignore every `dist` directory: React Native Web and other dependencies ship their runtime code there.

Serve and export commands use separate file-map cache directories under the OS temporary directory. A deserialize failure was logged while multiple Metro processes shared the previous cache. Separating purposes avoids sharing that serialized file between a live preview and an export. Run `node scripts/verify-metro-config.cjs` to verify path boundaries and consistent RegExp flags; this is included in `npm run check`.

A cold rebuild can still take time. The preview, exports and native compilation are separate checks; a passing bundle does not establish device acceptance.
