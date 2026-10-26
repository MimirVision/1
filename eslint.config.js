// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    // Build scripts run in Node.
    files: ['assets/source/**/*.js', 'store/**/*.js', 'scripts/**/*.js'],
    languageOptions: { globals: globals.node },
  },
]);
