import globals from 'globals';
import js from '@eslint/js';

export default [
  {
    ignores: ['node_modules/', '.env', 'dist/']
  },

  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      'no-console': 0,
      'no-useless-catch': 0,
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      semi: ['error', 'always'],
      quotes: ['error', 'single']
    }
  }
];
