import { cp, mkdir, readdir, readFile, writeFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const platform = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) throw new Error('Usage: npm run create:project -- /path/to/project [--packages /path/to/tarballs]');
const destination = path.resolve(args[0]);
const option = args.indexOf('--packages');
if (option >= 0 && !args[option + 1]) throw new Error('--packages requires a directory');
const tarballs = option >= 0 ? path.resolve(args[option + 1]) : null;
if (destination === platform || destination.startsWith(path.join(platform, 'templates') + path.sep)) throw new Error('Choose a new directory outside the platform templates');
let existing = [];
try { existing = await readdir(destination); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (existing.length) throw new Error('Destination must be empty; existing projects are never overwritten');
const blocked = new Set(['node_modules', '.next', '__pycache__', '.venv', '.env', '.git', 'next-env.d.ts', 'Dockerfile']);
await mkdir(destination, { recursive: true });
await cp(path.join(platform, 'templates/project'), destination, { recursive: true, filter: source => !blocked.has(path.basename(source)) && !source.endsWith('.tsbuildinfo') && (!path.basename(source).startsWith('.env.') || source.endsWith('.env.example')) });
// Ship one canonical skill source and relative discovery links for both agents.
await cp(path.join(platform, 'skills'), path.join(destination, 'skills'), { recursive: true });
for (const file of ['DESIGN.md', 'CLAUDE.md']) await cp(path.join(platform, file), path.join(destination, file));
for (const agent of ['.agents', '.claude']) {
  const directory = path.join(destination, agent, 'skills');
  await mkdir(directory, { recursive: true });
  for (const skill of await readdir(path.join(platform, 'skills'))) {
    await symlink(path.join('..', '..', 'skills', skill), path.join(directory, skill), 'dir');
  }
}
const manifestPath = path.join(destination, 'web/package.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const rootManifest = JSON.parse(await readFile(path.join(platform, 'package.json'), 'utf8'));
manifest.name = 'customer-web';
if (rootManifest.overrides) manifest.overrides = rootManifest.overrides;
manifest.devDependencies = { ...manifest.devDependencies, typescript: rootManifest.devDependencies.typescript, tsx: rootManifest.devDependencies.tsx, '@types/node': rootManifest.devDependencies['@types/node'], '@types/react': rootManifest.devDependencies['@types/react'], '@types/bcryptjs': rootManifest.devDependencies['@types/bcryptjs'] };
if (tarballs) {
  await mkdir(path.join(destination, 'vendor'), { recursive: true });
  for (const name of ['ui', 'chat', 'analytics', 'reports', 'mail', 'server']) {
    const version = manifest.dependencies[`@sensel/${name}`];
    const filename = `sensel-${name}-${version}.tgz`;
    await cp(path.join(tarballs, filename), path.join(destination, 'vendor', filename));
    manifest.dependencies[`@sensel/${name}`] = `file:../vendor/${filename}`;
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
await writeFile(path.join(destination, 'web/next-env.d.ts'), '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n');
await writeFile(path.join(destination, '.gitignore'), 'node_modules/\n.next/\n.env\n.env.*\n!.env.example\n.venv/\n__pycache__/\n*.tsbuildinfo\n');
console.log(`Created ${destination}. Install in web/; configure the Agent wheel as documented. No Git remote or services were changed.`);
