import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deployDir = resolve(root, 'deploy/r6ac-api');

const token = process.env.LIARA_API_TOKEN || process.env.LIARA_TOKEN;

if (!existsSync(resolve(deployDir, 'server.cjs'))) {
  console.log('Running prepare-api-standalone...');
  execSync('node scripts/prepare-api-standalone.mjs', { cwd: root, stdio: 'inherit' });
}

console.log('Deploying r6ac-api to Liara (build location: iran)...');
const deployEnv = { ...process.env };
if (token) {
  deployEnv.LIARA_API_TOKEN = token;
  deployEnv.LIARA_TOKEN = token;
} else {
  console.log('No LIARA_API_TOKEN set — using logged-in Liara CLI account.');
}

execSync('liara deploy --path deploy/r6ac-api --detach --build-location=iran', {
  cwd: root,
  stdio: 'inherit',
  env: deployEnv,
});

console.log('\nDeployment submitted. Check Liara Console → r6ac-api → تاریخچه');
