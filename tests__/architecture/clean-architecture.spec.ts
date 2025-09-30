// tests__/architecture/clean-architecture.spec.ts
import * as fs from 'fs';
import * as path from 'path';

describe('Clean Architecture Compliance', () => {
  const coreDir = path.resolve(__dirname, '../../src/core');

  function readAllFiles(dir: string, ext = '.ts'): string[] {
    let results: string[] = [];
    fs.readdirSync(dir).forEach((name) => {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        results = results.concat(readAllFiles(full, ext));
      } else if (name.endsWith(ext)) {
        results.push(full);
      }
    });
    return results;
  }

  it('core layer should not depend on infra or modules', () => {
    const coreFiles = readAllFiles(coreDir);
    coreFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/from ['"]\.\.\/\.\.\/src\/infra/);
      expect(content).not.toMatch(/from ['"]\.\.\/\.\.\/src\/modules/);
      expect(content).not.toMatch(/from ['"]src\/infra/);
      expect(content).not.toMatch(/from ['"]src\/modules/);
    });
  });

  it('use-cases should only depend on dtos, entities, ports, mappers, or direct imports (NestJS/Zod)', () => {
    const ucDir = path.join(coreDir, 'use-cases');
    const ucFiles = readAllFiles(ucDir);

    const allowedCoreFolders = ['dtos', 'entities', 'ports', 'mappers', 'use-cases'];

    ucFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');

      // Regex para encontrar todas as importações relativas
      const relativeImportRegex = /from\s+['"]((?:\.\.\/)+([^'"]*))['"]|from\s+['"]\.\/([^'"]*)['"]/g;
      let match;
      const violations: string[] = [];

      while ((match = relativeImportRegex.exec(content)) !== null) {
        const fullPath = match[1] || match[3];
        const pathAfterDots = match[2] || fullPath;

        if (fullPath.includes('@nestjs') || fullPath.includes('zod') || fullPath.includes('crypto')) {
          continue;
        }

        const firstSegment = pathAfterDots.split('/')[0];
        if (!allowedCoreFolders.includes(firstSegment)) {
          violations.push(match[0] as never);
        }
      }

      if (violations.length > 0) {
        throw new Error(`[${path.basename(file)}] Found invalid core relative dependency: ${violations.join(', ')}`);
      }

      // Correção do falso negativo: não exigir entity/port se não houver import
      if (!path.basename(file).includes('.spec.ts')) {
        const importsEntities = !!content.match(/from ['"].*entities(\/[\w-]+)*['"]/);
        const importsPorts = !!content.match(/from ['"].*ports(\/[\w-]+)*['"]/);

        // Apenas warn se nenhum dos dois estiver presente
        if (!importsEntities && !importsPorts) {
          console.warn(`[${path.basename(file)}] No import of entities or ports found — check if this is correct.`);
        }
      }
    });
  });

  it('ports should define interfaces only, no implementations', () => {
    const portsDir = path.join(coreDir, 'ports');
    const portFiles = readAllFiles(portsDir);
    portFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toMatch(/export interface/);
      expect(content).not.toMatch(/class\s+\w+/);
      expect(content).not.toMatch(/new\s+\w+\(/);
    });
  });
});
