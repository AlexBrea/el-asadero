import js from '@eslint/js';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ['node_modules/**', 'chrome-extension/**', 'coverage/**'] },
  {
    ...js.configs.recommended,
    files: ['assets/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, firebase: 'readonly', FIREBASE_CONFIG: 'readonly' },
    },
    plugins: { jsdoc },
    rules: {
      ...js.configs.recommended.rules,
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { caughtErrors: 'none', argsIgnorePattern: '^_' }],
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/valid-types': 'error',
      'jsdoc/require-description': ['error', { contexts: ['FunctionDeclaration'] }],
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-returns-type': 'error',
      'jsdoc/require-jsdoc': ['error', { publicOnly: true }],
    },
  },
  {
    files: ['assets/js/background-ticker.js'],
    languageOptions: { globals: globals.worker },
  },
  {
    ...js.configs.recommended,
    files: ['tests/**/*.cjs', 'tests/**/*.mjs', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
