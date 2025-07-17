import globals from 'globals';
import js from '@eslint/js';

export default [
  {
    ignores: ['node_modules/', '.env', 'dist/']
  },

  js.configs.recommended,

  // Наша основная конфигурация
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node, // Все глобальные переменные Node.js
        ...globals.browser // Добавляем все глобальные переменные браузера (document, window и т.д.)
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
