/**
 * Liara deployment diagnostics (read-only by default).
 *
 * Usage:
 *   $env:LIARA_API_TOKEN = "your-token"   # never commit tokens
 *   node scripts/liara-diagnose.mjs
 *   node scripts/liara-diagnose.mjs --disable-zdt
 */

const API_BASE = 'https://api.iran.liara.ir';
const APP_NAME = process.env.LIARA_APP_NAME || 'r6ac-api';

const token = process.env.LIARA_API_TOKEN || process.env.LIARA_TOKEN;
if (!token) {
  console.error('Set LIARA_API_TOKEN (or LIARA_TOKEN) to your Liara API token.');
  console.error('Create one at: https://console.liara.ir → Settings → API Tokens');
  process.exit(1);
}

const disableZdt = process.argv.includes('--disable-zdt');

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  console.log(`\n=== Liara diagnose: ${APP_NAME} ===\n`);

  const raw = await api(`/v1/projects/${APP_NAME}`);
  const project = raw.project ?? raw;
  const projectId = project._id || project.id || raw._id;
  console.log('Project ID:', projectId ?? '(not found)');
  console.log('Status:', project.status ?? project.state ?? '(unknown)');
  console.log('Type:', project.type ?? project.projectType ?? '(unknown)');
  console.log('Zero-downtime:', project.zeroDowntime ?? '(unknown)');

  const releases = await api(`/v1/projects/${APP_NAME}/releases?page=1&count=10`);
  const list = releases.releases ?? [];
  console.log('\nRecent releases:');
  console.log('  Current:', releases.currentRelease ?? '(none)');
  console.log('  Ready count:', releases.readyReleasesCount ?? 0);
  console.log('─'.repeat(72));

  for (const r of list) {
    const tag = r.tag ?? r._id?.slice(-8) ?? '?';
    console.log(
      `  v${tag}  state=${r.state ?? '?'}  type=${r.type ?? '?'}  port=${r.port ?? '?'}`,
    );
    if (r.imageName) console.log(`         image=${r.imageName}`);
    if (r.reason) console.log(`         reason=${r.reason}`);
  }

  const pending = list.filter((r) =>
    ['pending', 'PENDING', 'معلق', 'building', 'BUILDING'].includes(String(r.state)),
  );
  if (pending.length) {
    console.log('\n⚠ Pending/building releases detected.');
    console.log('  → Cancel them in Console → تاریخچه → لغو');
    console.log('  → Ensure healthCheck in deploy/r6ac-api/liara.json (run pnpm deploy:api)');
    console.log('  → Or disable zero-downtime: node scripts/liara-diagnose.mjs --disable-zdt');
  }

  if (disableZdt) {
    if (!projectId) {
      console.error('\nCannot disable zero-downtime: project ID not found in API response.');
      console.error('Disable manually: Liara Console → r6ac-api → تنظیمات → استقرار بدون اختلال');
      process.exit(1);
    }
    await api(`/v1/projects/${projectId}/zero-downtime/disable`, { method: 'POST' });
    console.log('\n✔ Zero-downtime deployment disabled for this app.');
    console.log('  Cancel pending releases in Console → تاریخچه → لغو');
    console.log('  Then redeploy: pnpm deploy:api');
  }

  console.log('\nVerify after a successful deploy:');
  console.log(`  https://${APP_NAME}.liara.run/health/live\n`);
}

main().catch((err) => {
  console.error('\nDiagnose failed:', err.message);
  if (String(err.message).includes('401')) {
    console.error('Token invalid or expired — rotate at Liara → Settings → API Tokens.');
  }
  process.exit(1);
});
