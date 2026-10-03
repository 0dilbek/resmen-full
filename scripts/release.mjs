import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
await readFile('.next/standalone/server.js');
async function assertClean(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    if (entry.name === '.env' || entry.name.startsWith('.env.') || ['.local', '.git', 'test-results', 'playwright-report'].includes(entry.name)) {
      throw Error('Private development file found in standalone output; rebuild before releasing');
    }
    if (entry.isDirectory()) await assertClean(`${directory}/${entry.name}`);
  }
}
await assertClean('.next/standalone');
const version=new Date().toISOString().replace(/[:.]/g,'-');
await mkdir('.local/releases',{recursive:true,mode:0o700});
const path=`.local/releases/ravoq-${version}.tar.gz`;
// Explicit allowlist: credentials, test data, uploads, and repository metadata never enter releases.
await exec('tar',['-czf',path,'.next/standalone','src','messages','scripts','drizzle','deploy','docs','branding','README.md','package.json','pnpm-lock.yaml','tsconfig.json','drizzle.config.ts','.nvmrc']);
const digest=createHash('sha256').update(await readFile(path)).digest('hex');await writeFile(`${path}.sha256`,`${digest}  ${path.split('/').pop()}\n`,{mode:0o600});console.info(`Release artifact: ${path}`);console.info(`SHA-256: ${digest}`);
