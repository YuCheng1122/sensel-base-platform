import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(directory, '../../..');
/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ['@sensel/ui', '@sensel/chat', '@sensel/server', '@sensel/analytics', '@sensel/reports'],
  output: 'standalone',
  outputFileTracingRoot: existsSync(path.join(workspace, 'package-lock.json')) ? workspace : directory,
  experimental: { cpus: 2 },
};
