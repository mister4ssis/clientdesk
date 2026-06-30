import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const scriptPath = 'scripts/verify-release-version.mjs';

describe('verify-release-version script', () => {
  it('accepts a tag that matches package.json version', () => {
    expect(() =>
      execFileSync('node', [scriptPath, 'v0.9.0-rc.1'], { stdio: 'pipe' })
    ).not.toThrow();
  });

  it('accepts beta and rc tags when they match the package version argument contract', () => {
    expect(() => execFileSync('node', [scriptPath], { stdio: 'pipe' })).not.toThrow();
  });

  it('rejects invalid tags and version mismatches', () => {
    expect(() =>
      execFileSync('node', [scriptPath, 'release-0.9.0-rc.1'], { stdio: 'pipe' })
    ).toThrow();
    expect(() => execFileSync('node', [scriptPath, 'v0.9.0'], { stdio: 'pipe' })).toThrow();
  });
});
