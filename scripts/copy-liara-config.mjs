import { copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve(process.cwd(), 'liara.json');
const app = process.argv[2];

if (!app) {
  if (existsSync(target)) unlinkSync(target);
  process.exit(0);
}

const source = resolve(process.cwd(), `apps/${app}/liara.json`);
copyFileSync(source, target);
console.log(`Using ${source} for Liara deploy`);
