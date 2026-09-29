import assert from 'node:assert/strict';
import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const platform = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2]) throw new Error('Usage: node scripts/check-consumer.mjs /path/to/generated/web');
const consumer = await realpath(path.resolve(process.argv[2]));
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const root = await readJson(path.join(platform, 'package.json'));
const manifest = await readJson(path.join(consumer, 'package.json'));
assert.deepEqual(manifest.overrides, root.overrides, 'Generated projects must retain dependency security overrides');
let count = 0;
for (const directory of await readdir(path.join(platform, 'packages'))) {
  const expected = await readJson(path.join(platform, 'packages', directory, 'package.json'));
  assert.match(manifest.dependencies[expected.name] ?? '', /^file:\.\.\/vendor\/.+\.tgz$/, `${expected.name} must use a local release archive`);
  const installedDirectory = await realpath(path.join(consumer, 'node_modules', expected.name));
  assert.ok(installedDirectory.startsWith(consumer + path.sep), `${expected.name} must not resolve to workspace source`);
  const installed = await readJson(path.join(installedDirectory, 'package.json'));
  assert.equal(installed.version, expected.version, `${expected.name} version mismatch`);
  count++;
}
// Verify the actual transitive install, not only the manifest declaration.
if (root.overrides?.next?.postcss) {
  const nextRequire = createRequire(path.join(consumer, 'node_modules', 'next', 'package.json'));
  const postcss = await readJson(nextRequire.resolve('postcss/package.json'));
  assert.equal(postcss.version, root.overrides.next.postcss, 'Next must use the pinned PostCSS version');
}
console.log(`Verified ${count} independent package archives and inherited security overrides.`);
