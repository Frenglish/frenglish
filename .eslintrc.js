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
    'no-restricted-syntax': [
      'error',
      {
        selector: 'VariableDeclarator[id.name="FRENGLISH_BACKEND_URL"] Literal[value=/localhost/]',
        message: 'FRENGLISH_BACKEND_URL should not be set to a localhost URL.'
      }
    ]
  },
  overrides: [
    {
      files: ['**/*.ts'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'VariableDeclarator[id.name="FRENGLISH_BACKEND_URL"] Literal[value=/localhost/]',
            message: 'FRENGLISH_BACKEND_URL should not be set to a localhost URL.'
          }
        ]
      },
    },
  ],
};
