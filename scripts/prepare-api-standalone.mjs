import { execSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = resolve(root, 'apps/api');
const outDir = resolve(root, 'deploy/r6ac-api');

// Node-only probe — no wget/curl/apk (Alpine CDN often blocked on Iran build hosts)
const HEALTH_CHECK_CMD =
  "node -e \"require('http').get('http://127.0.0.1:3001/health/live',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))\"";

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

console.log('Building API bundle...');
execSync(
  'pnpm exec esbuild src/server.ts --bundle --platform=node --target=node20 --format=cjs --outfile=dist/server.cjs',
  { cwd: apiDir, stdio: 'inherit' },
);

copyFileSync(resolve(apiDir, 'dist/server.cjs'), resolve(outDir, 'server.cjs'));

writeFileSync(
  resolve(outDir, 'package.json'),
  JSON.stringify(
    {
      name: 'r6ac-api',
      private: true,
      scripts: { start: 'node server.cjs' },
      engines: { node: '>=20' },
    },
    null,
    2,
  ),
);

writeFileSync(
  resolve(outDir, 'Dockerfile'),
  `FROM hub.hamdocker.ir/library/node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
COPY server.cjs ./
EXPOSE 3001
CMD ["node", "server.cjs"]
`,
);

writeFileSync(
  resolve(outDir, 'liara.json'),
  JSON.stringify(
    {
      app: 'r6ac-api',
      platform: 'docker',
      port: 3001,
      build: { location: 'iran', cache: false },
      healthCheck: {
        command: HEALTH_CHECK_CMD,
        interval: 30,
        timeout: 15,
        retries: 5,
        startPeriod: 3000,
      },
    },
    null,
    2,
  ),
);

writeFileSync(
  resolve(outDir, '.dockerignore'),
  `# Only server.cjs is needed; Dockerfile copies it explicitly
`,
);

const sizeMb = statSync(resolve(outDir, 'server.cjs')).size / 1024 / 1024;
console.log(`Ready: ${outDir} (~${sizeMb.toFixed(1)} MB)`);
