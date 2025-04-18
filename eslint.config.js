// eslint.config.js
const { defineConfig } = require('eslint/config')

module.exports = defineConfig([
  {
    root: true,
    parser: '@typescript-eslint/parser',
    env: { node: true },
    plugins: ['@typescript-eslint'],
    ignore: ['build', 'node_modules'],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
    ],
    parserOptions: {
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-prototype-builtins': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
])
