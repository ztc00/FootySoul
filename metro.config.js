// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Watchman should be automatically detected, but we can configure it explicitly
// This helps prevent EMFILE errors
config.watchFolders = [__dirname];
config.resolver = {
  ...config.resolver,
  // Reduce the number of files Metro needs to watch
  blockList: [/node_modules\/.*\/node_modules\/react-native\/.*/],
  resolveRequest: (context, moduleName, platform) => {
    if (platform === 'web') {
      if (moduleName === 'react-native-maps') {
        return { filePath: path.resolve(__dirname, 'src/mocks/react-native-maps.js'), type: 'sourceFile' };
      }
      if (moduleName === '@stripe/stripe-react-native') {
        return { filePath: path.resolve(__dirname, 'src/mocks/stripe-react-native.js'), type: 'sourceFile' };
      }
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;

