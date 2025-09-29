// tests__/architecture/clean-architecture.spec.ts
import * as fs from 'fs';
import * as path from 'path';

describe('Clean Architecture Compliance', () => {
    const coreDir = path.resolve(__dirname, '../../src/core');
    const infraDir = path.resolve(__dirname, '../../src/infra');
    const modulesDir = path.resolve(__dirname, '../../src/modules');

    function readAllFiles(dir: string, ext = '.ts'): string[] {
        let results: string[] = [];
        fs.readdirSync(dir).forEach(name => {
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
        coreFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            expect(content).not.toMatch(/from ['"]\.\.\/\.\.\/src\/infra/);
            expect(content).not.toMatch(/from ['"]\.\.\/\.\.\/src\/modules/);
        });
    });

    it('use-cases should only depend on entities and ports', () => {
        const ucDir = path.join(coreDir, 'use-cases');
        const ucFiles = readAllFiles(ucDir);
        ucFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            expect(content).toMatch(/from ['"]\.\.\/entities/);
            expect(content).toMatch(/from ['"]\.\.\/ports/);
            expect(content).not.toMatch(/from ['"]\.\.\/\.\.\/infra/);
        });
    });

    it('ports should define interfaces only, no implementations', () => {
        const portsDir = path.join(coreDir, 'ports');
        const portFiles = readAllFiles(portsDir);
        portFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            expect(content).toMatch(/export interface/);
            expect(content).not.toMatch(/class\s+\w+/);
            expect(content).not.toMatch(/new\s+\w+\(/);
        });
    });
});
