import globals from 'globals';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import typescriptEslintParser from '@typescript-eslint/parser';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cria compat para usar configs antigas
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Base do recommended-type-checked
const tsBaseConfig = compat.config({
  extends: ['plugin:@typescript-eslint/recommended-type-checked'],
})[0];

export default [
  // 1️⃣ Ignorar arquivos
  {
    ignores: ['dist/**', 'src/schema.gql', 'prisma/seed/**/*.ts'],
  },

  // 2️⃣ Configuração JS padrão
  js.configs.recommended,

  // 3️⃣ Prettier
  ...compat.extends('plugin:prettier/recommended'),

  // 4️⃣ TypeScript
  {
    files: ['**/*.ts'],
    ...tsBaseConfig,
    languageOptions: {
      parser: typescriptEslintParser,
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
              message: 'Core layer must not import infra or modules',
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

  // 5️⃣ Override para arquivos de ports
  {
    files: ['src/core/ports/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // 6️⃣ Override específico para seeds
  {
    files: ['prisma/seed/**/*.ts'],
    languageOptions: {
      parser: undefined, // desativa parser TS
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
];
