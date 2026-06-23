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
      'lint',
      'typecheck',
      'test',
      'test:watch',
      'package',
      'package:dir',
      'package:win',
      'rebuild:electron'
    ];

    for (const scriptName of expectedScripts) {
      expect(typeof packageJson.scripts[scriptName], scriptName).toBe('string');
      expect(packageJson.scripts[scriptName]?.length, scriptName).toBeGreaterThan(0);
    }
  });
});

interface PackageJson {
  scripts: Record<string, string>;
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
    value.scripts !== null
  );
}
