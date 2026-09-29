import { mkdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const destination = path.resolve(process.argv[2] ?? 'artifacts/packages');
await mkdir(destination, { recursive: true });
for (const name of ['ui', 'chat', 'analytics', 'reports', 'mail', 'server']) {
  const manifest = JSON.parse(await readFile(`packages/${name}/package.json`, 'utf8'));
  const result = spawnSync('npm', ['pack', '--workspace', manifest.name, '--pack-destination', destination], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Packages written to ${destination}`);
