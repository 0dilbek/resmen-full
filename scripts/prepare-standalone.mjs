import { cp, readdir, rm } from 'node:fs/promises';
await cp('public', '.next/standalone/public', { recursive: true });
await cp('.next/static', '.next/standalone/.next/static', { recursive: true });
// File tracing can include dynamic development filesystem paths. Never ship them.
for (const name of await readdir('.next/standalone')) {
  if (name === '.env' || name.startsWith('.env.') || ['.local', 'test-results', 'playwright-report', '.git'].includes(name)) {
    await rm(`.next/standalone/${name}`, { recursive: true, force: true });
  }
}
console.info('Standalone assets prepared; private development files excluded.');
