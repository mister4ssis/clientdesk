import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowPaths = [
  '.github/workflows/build-windows.yml',
  '.github/workflows/release-candidate.yml',
  '.github/workflows/release-windows.yml'
];

describe('Windows workflows Supabase build environment', () => {
  it('injects sanitized Supabase build variables and verifies them before building', () => {
    for (const workflowPath of workflowPaths) {
      const workflow = readFileSync(path.join(process.cwd(), workflowPath), 'utf8');

      expect(workflow).toContain('MAIN_VITE_SUPABASE_URL: ${{ vars.MAIN_VITE_SUPABASE_URL }}');
      expect(workflow).toContain(
        'MAIN_VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.MAIN_VITE_SUPABASE_PUBLISHABLE_KEY }}'
      );
      expect(workflow).toContain('npm run verify:supabase-build-env');
      expect(workflow).not.toContain('SERVICE_ROLE');
      expect(workflow).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    }
  });
});
