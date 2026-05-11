module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@features': './src/features',
          '@core': './src/core',
          '@services': './src/services',
          '@navigation': './src/navigation',
          '@theme': './src/theme',
          '@store': './src/store',
          '@config': './src/config',
        },
      },
    ],
  ],
};
