const globals = require('globals');
const js = require('@eslint/js');
const { FlatCompat } = require('@eslint/eslintrc');
// Importa o parser TS usando o require padrão do Node.js
const typescriptEslintParser = require('@typescript-eslint/parser');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Carrega as regras base do recommended-type-checked de uma vez
const tsBaseConfig = compat.config({
  extends: ['plugin:@typescript-eslint/recommended-type-checked'],
})[0];

module.exports = [
  // 1. Arquivos Ignorados Globalmente
  {
    ignores: ['dist/**', 'src/schema.gql'],
  },

  // 2. Configuração Padrão JavaScript (aplica-se a todos os arquivos)
  js.configs.recommended,

  // 3. Configuração Prettier (aplica-se em todo lugar, corrige a maioria dos erros)
  ...compat.extends('plugin:prettier/recommended'),
  
  // 4. Configuração Específica para Arquivos TypeScript (APENAS arquivos .ts)
  {
    files: ['**/*.ts'],

    // 4a. Espalha plugins e rules carregadas do config base
    ...tsBaseConfig,

    // 4b. Habilita o parser TypeScript e as opções de tipagem (sobrescreve o languageOptions do base)
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

    // 4c. Custom Rules (Sobrescreve regras do base com as suas customizadas)
    rules: {
      // Espalha as regras originais do base para podermos aplicar overrides
      ...tsBaseConfig.rules,

      // Overrides existentes
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'no-restricted-imports': 'warn',

      // Regra de arquitetura (Core layer must not import infra or modules)
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

    // 4d. Settings
    settings: {
      'import/resolver': {
        typescript: { project: ['./tsconfig.json'] },
      },
    },
  },
];
