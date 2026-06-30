import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const requiredKeys = ['MAIN_VITE_SUPABASE_URL', 'MAIN_VITE_SUPABASE_PUBLISHABLE_KEY'];
const env = {
  ...readDotEnv(path.join(process.cwd(), '.env')),
  ...process.env
};
const failures = [];

for (const key of requiredKeys) {
  if (!normalize(env[key])) {
    failures.push(`${key} is required for Windows builds.`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exitCode = 1;
} else {
  console.log('Supabase build environment verification passed.', {
    hasSupabaseUrl: true,
    hasPublishableKey: true
  });
}

function readDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const result = {};
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');

    result[key] = value;
  }

  return result;
}

function normalize(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
