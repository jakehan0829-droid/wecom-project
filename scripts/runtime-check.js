import { execSync } from 'node:child_process';
import http from 'node:http';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

async function main() {
  const result = {
    pm2: { ok: false, detail: '' },
    health: { ok: false, detail: '' },
    overallOk: false
  };

  try {
    const pm2Status = run('pm2 status chronic-disease-backend');
    result.pm2.ok = /online/.test(pm2Status);
    result.pm2.detail = pm2Status;
  } catch (err) {
    result.pm2.detail = String(err);
  }

  try {
    const health = await httpGet('http://127.0.0.1:3000/health');
    result.health.ok = health.statusCode === 200 && health.body.includes('"status":"ok"');
    result.health.detail = health.body;
  } catch (err) {
    result.health.detail = String(err);
  }

  result.overallOk = result.pm2.ok && result.health.ok;
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.overallOk ? 0 : 1);
}

main();
