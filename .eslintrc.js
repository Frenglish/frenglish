const enforceNoLocalhostRule = require('./.eslint/rules/enforce-no-localhost');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  env: {
    node: true,
    es2021: true,
  },
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    // Use your custom rule under a made-up name
    'frenglish/no-localhost': 'error',
  },
  overrides: [
    {
      files: ['**/*.ts'],
      rules: {
        'frenglish/no-localhost': 'error',
      },
    },
  ],
  // Register your custom rule here
  settings: {
    customRules: {
      'frenglish/no-localhost': enforceNoLocalhostRule,
    },
  },
};
