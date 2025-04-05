const { getDefaultConfig } = require('expo/metro-config');
const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    sourceExts: [...defaultConfig.resolver.sourceExts, 'mjs', 'cjs'],
    assetExts: [...defaultConfig.resolver.assetExts],
    platforms: ['ios', 'android', 'web'],
  },
  server: {
    port: 8081,
    host: '0.0.0.0',
  },
  watchFolders: [__dirname],
  transformer: {
    ...defaultConfig.transformer,
    minifierPath: require.resolve('metro-minify-terser'),
    minifierConfig: {
      keep_classnames: true,
      keep_fnames: true,
      mangle: false,
    },
  },
}; 