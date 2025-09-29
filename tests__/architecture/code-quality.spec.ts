import { ESLint } from 'eslint';
import * as path from 'path';

describe('Code Quality Standards', () => {
  const eslint = new ESLint({ cwd: path.resolve(__dirname, '../../') });

  it('should have zero ESLint errors', async () => {
    const results = await eslint.lintFiles(['src/**/*.ts']);
    const hasErrors = results.some((r) => r.errorCount > 0);
    if (hasErrors) {
      const formatter = await eslint.loadFormatter('stylish');
      const resultText = formatter.format(results);
      console.log(resultText);
    }
    expect(hasErrors).toBe(false);
    // CORREÇÃO: Aumentar o timeout de 15s para 30s (30000ms)
  }, 30000);

  it('should have zero TypeScript compile errors', async () => {
    const exec = require('child_process').execSync;
    try {
      exec('npm run type-check', { stdio: 'ignore' });
    } catch (err) {
      throw new Error('TypeScript type checking failed', { cause: err });
    }
  });
});
