import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/verify-supabase-build-env.mjs');

describe('verify-supabase-build-env', () => {
  it('passes when Supabase URL and publishable key are configured', () => {
    const output = execFileSync('node', [scriptPath], {
      env: {
        ...process.env,
        MAIN_VITE_SUPABASE_URL: 'https://example.supabase.co',
        MAIN_VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key'
      },
      encoding: 'utf8'
    });

    expect(output).toContain('Supabase build environment verification passed.');
    expect(output).not.toContain('https://example.supabase.co');
    expect(output).not.toContain('publishable-key');
  });

  it('fails without Supabase URL', () => {
    const result = spawnSync('node', [scriptPath], {
      env: {
        ...process.env,
        MAIN_VITE_SUPABASE_URL: '',
        MAIN_VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key'
      },
      encoding: 'utf8'
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('MAIN_VITE_SUPABASE_URL is required');
    expect(result.stderr).not.toContain('publishable-key');
  });

  it('fails without Supabase publishable key', () => {
    const result = spawnSync('node', [scriptPath], {
      env: {
        ...process.env,
        MAIN_VITE_SUPABASE_URL: 'https://example.supabase.co',
        MAIN_VITE_SUPABASE_PUBLISHABLE_KEY: ''
      },
      encoding: 'utf8'
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('MAIN_VITE_SUPABASE_PUBLISHABLE_KEY is required');
    expect(result.stderr).not.toContain('https://example.supabase.co');
  });
});
