import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const essentialFiles = [
  'electron.vite.config.ts',
  'electron-builder.yml',
  'src/main/index.ts',
  'src/preload/index.ts',
  'src/renderer/src/main.tsx',
  'src/main/database/migrations/001-create-customers.sql'
];

describe('project smoke checks', () => {
  it('keeps essential build inputs present', () => {
    for (const filePath of essentialFiles) {
      expect(existsSync(path.resolve(filePath)), filePath).toBe(true);
    }
  });

  it('defines the expected MVP validation and packaging scripts', () => {
    const packageJson = readPackageJson();
    const expectedScripts = [
      'dev',
      'build',
      'ensure:electron',
      'lint',
      'typecheck',
      'test',
      'test:integration',
      'test:package',
      'test:watch',
      'package',
      'package:dir',
      'package:win',
      'verify:package',
      'rebuild:electron'
    ];

    for (const scriptName of expectedScripts) {
      expect(typeof packageJson.scripts[scriptName], scriptName).toBe('string');
      expect(packageJson.scripts[scriptName]?.length, scriptName).toBeGreaterThan(0);
    }

    expect(packageJson.dependencies['better-sqlite3']).toBeTruthy();
    expect(packageJson.devDependencies.electron).toBeTruthy();
    expect(packageJson.devDependencies['electron-builder']).toBeTruthy();
  });

  it('loads renderer HTML instead of compiled JavaScript assets in production', () => {
    const mainWindowSource = readFileSync(
      path.resolve('src/main/windows/main-window.ts'),
      'utf8'
    );
    const rendererHtml = readFileSync(path.resolve('src/renderer/index.html'), 'utf8');

    expect(mainWindowSource).toContain("join(__dirname, '../preload/index.js')");
    expect(mainWindowSource).toContain("join(__dirname, '../renderer/index.html')");
    expect(mainWindowSource).toContain('mainWindow.loadFile(rendererHtmlPath)');
    expect(mainWindowSource).not.toContain('loadFile(join(__dirname,');
    expect(mainWindowSource).not.toContain('../renderer/assets');
    expect(rendererHtml).toContain('<meta charset="UTF-8" />');
    expect(rendererHtml).toContain('<div id="root"></div>');
    expect(rendererHtml).toContain('<script type="module" src="/src/main.tsx"></script>');
  });
});

interface PackageJson {
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

function readPackageJson(): PackageJson {
  const parsed = JSON.parse(readFileSync(path.resolve('package.json'), 'utf8')) as unknown;

  if (!isPackageJson(parsed)) {
    throw new Error('Invalid package.json shape.');
  }

  return parsed;
}

function isPackageJson(value: unknown): value is PackageJson {
  return (
    typeof value === 'object' &&
    value !== null &&
    'scripts' in value &&
    typeof value.scripts === 'object' &&
    value.scripts !== null &&
    'dependencies' in value &&
    typeof value.dependencies === 'object' &&
    value.dependencies !== null &&
    'devDependencies' in value &&
    typeof value.devDependencies === 'object' &&
    value.devDependencies !== null
  );
}
