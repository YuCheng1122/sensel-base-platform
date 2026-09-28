import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const roots = ['packages', 'python/src'];
const failures = [];
async function scan(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!['node_modules', '__pycache__', 'dist'].includes(entry.name)) await scan(file); continue; }
    if (!/\.(tsx?|py)$/.test(file)) continue;
    const text = await readFile(file, 'utf8');
    if (/sensel-full-stack|sensel-agent\/src|from\s+["']@\//.test(text)) failures.push(`${file}: core depends on a source/customer alias`);
    if (/from\s+["']@elastic\/elasticsearch|from\s+["']@prisma\/client|import\s+elasticsearch/.test(text)) failures.push(`${file}: core binds to optional/customer-owned storage`);
    if (!/\.test\.|\/tests\//.test(file) && text.trimEnd().split('\n').length > 400) failures.push(`${file}: exceeds 400-line production-module limit`);
  }
}
for (const root of roots) await scan(root);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Core boundaries and module-size checks passed.');
