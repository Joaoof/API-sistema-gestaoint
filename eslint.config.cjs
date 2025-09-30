const path = require('path');
const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const globals = require('globals');

const compat = new FlatCompat({ baseDirectory: __dirname });

const tsBaseConfig = compat.config({
  extends: ['plugin:@typescript-eslint/recommended-type-checked'],
})[0];

module.exports = [
  {
    ignores: ['dist/**', 'src/schema.gql', 'prisma/seed/**/*.ts'],
  },
  js.configs.recommended,
  ...compat.extends('plugin:prettier/recommended'),
  {
    files: ['**/*.ts'],
    ...tsBaseConfig,
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      ...tsBaseConfig.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['src/infra/*', 'src/modules/*'],
              message: 'Core layer must not import infra ou modules',
            },
          ],
        },
      ],
    },
    settings: {
      'import/resolver': {
        typescript: { project: ['./tsconfig.json'] },
      },
    },
  },
  {
    files: ['src/core/ports/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['prisma/seed/**/*.ts'],
    languageOptions: {
      parser: undefined,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
];
