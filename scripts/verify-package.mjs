import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const requiredBuildFiles = [
  'out/main/index.js',
  'out/preload/index.js',
  'out/renderer/index.html',
  'src/main/database/migrations/001-create-customers.sql'
];
const forbiddenReleasePatterns = [
  /\.sqlite$/i,
  /\.sqlite-wal$/i,
  /\.sqlite-shm$/i,
  /\.db$/i,
  /\.log$/i
];

const failures = [];

for (const filePath of requiredBuildFiles) {
  assertExists(path.join(projectRoot, filePath), `Missing required build input: ${filePath}`);
}

const packageJson = readJson(path.join(projectRoot, 'package.json'));
assertEqual(packageJson.main, 'out/main/index.js', 'package.json main must point to out/main/index.js');
assertDependency(packageJson, 'better-sqlite3', 'dependencies');
assertDependency(packageJson, 'electron', 'devDependencies');
assertDependency(packageJson, 'electron-builder', 'devDependencies');

const releaseDirectory = path.join(projectRoot, 'release');

if (existsSync(releaseDirectory)) {
  const releaseFiles = listFiles(releaseDirectory);

  assertSome(
    releaseFiles,
    (filePath) => filePath.endsWith(path.join('migrations', '001-create-customers.sql')),
    'Packaged release must include migrations/001-create-customers.sql'
  );
  assertSome(
    releaseFiles,
    (filePath) => filePath.endsWith('.asar'),
    'Packaged release must include an ASAR archive'
  );
  assertSome(
    releaseFiles,
    (filePath) => path.basename(filePath) === 'better_sqlite3.node',
    'Packaged release must include better_sqlite3.node'
  );

  for (const filePath of releaseFiles) {
    const relativePath = path.relative(projectRoot, filePath);
    const isForbidden = forbiddenReleasePatterns.some((pattern) => pattern.test(filePath));

    if (isForbidden) {
      failures.push(`Forbidden data file found in release output: ${relativePath}`);
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exitCode = 1;
} else {
  console.log('Package verification passed.');
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function assertExists(filePath, message) {
  if (!existsSync(filePath)) {
    failures.push(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    failures.push(`${message}. Expected ${expected}, got ${String(actual)}.`);
  }
}

function assertDependency(packageJson, dependencyName, sectionName) {
  const dependencies = packageJson[sectionName];

  if (!dependencies || typeof dependencies[dependencyName] !== 'string') {
    failures.push(`${dependencyName} must be listed in ${sectionName}.`);
  }
}

function assertSome(items, predicate, message) {
  if (!items.some(predicate)) {
    failures.push(message);
  }
}

function listFiles(directory) {
  const entries = readdirSync(directory);
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      files.push(...listFiles(entryPath));
    } else {
      files.push(entryPath);
    }
  }

  return files;
}
