const { withProjectBuildGradle } = require("expo/config-plugins");
// Bound object paths so Windows Ninja works in the user's OneDrive checkout.
module.exports = (config) =>
  withProjectBuildGradle(config, (config) => {
    const marker = "// eFlow: bounded Windows native object paths";
    let source = config.modResults.contents.replace(
      /\/\/ eFlow: bounded Windows native object paths[\s\S]*?\/\/ eFlow: end native paths\s*/g,
      "",
    );
    if (source.includes(marker)) source = source.split(marker)[0].trimEnd();
    const nativePaths = `\n${marker}\nsubprojects { subproject ->
  ['com.android.application', 'com.android.library'].each { androidPlugin ->
    subproject.plugins.withId(androidPlugin) {
      subproject.extensions.getByName('android').defaultConfig.externalNativeBuild.cmake.arguments('-DCMAKE_OBJECT_PATH_MAX=250', '-DCMAKE_JOB_POOLS=eflow_compile=2', '-DCMAKE_JOB_POOL_COMPILE=eflow_compile', '-DCMAKE_JOB_POOL_LINK=eflow_compile')
      if (System.getProperty('os.name').toLowerCase().contains('windows')) {
        subproject.extensions.getByName('android').externalNativeBuild.cmake.buildStagingDirectory = new File(System.getProperty('user.home'), '.eflow/cxx/mobile/' + subproject.name)
      }
    }
  }
}\n// eFlow: end native paths\n`;
    config.modResults.contents = source.replace(
      /(?=apply plugin: ["']expo-root-project["'])/,
      nativePaths + "\n",
    );
    return config;
  });
