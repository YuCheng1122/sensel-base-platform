import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
const skipped = new Set(['.git', 'node_modules', '.next', '.venv', 'dist', 'artifacts', 'test-results', 'playwright-report', '__pycache__']);
const failures = [];
let documents = 0;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await scan(file); continue; }
    if (!file.endsWith('.md')) continue;
    documents++;
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^(https?:|mailto:)/.test(target)) continue;
      try { await access(path.resolve(path.dirname(file), target)); }
      catch { failures.push(`${file}: missing link ${target}`); }
    }
    if ((text.match(/^```/gm)?.length ?? 0) % 2) failures.push(`${file}: unclosed code fence`);
  }
}
await scan('.');
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`Checked ${documents} Markdown documents: local links and fences valid.`);
