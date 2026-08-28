import fs from 'node:fs/promises';
import path from 'node:path';

function boolEnv(name, fallback = false) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(raw).toLowerCase());
}

export async function loadE2EConfig() {
  const raw = await fs.readFile(path.resolve('config/e2e.json'), 'utf8');
  const routes = JSON.parse(raw);
  const baseUrl = (process.env.MASSAGEMHUB_BASE_URL || 'https://massagemhub.com.br').replace(/\/$/, '');

  return {
    baseUrl,
    routes,
    timeoutMs: Number(process.env.E2E_TIMEOUT_MS || 20000),
    screenshots: boolEnv('E2E_SCREENSHOTS', false),
    advertiser: {
      email: process.env.MASSAGEMHUB_ADVERTISER_EMAIL || '',
      password: process.env.MASSAGEMHUB_ADVERTISER_PASSWORD || ''
    },
    admin: {
      email: process.env.MASSAGEMHUB_ADMIN_EMAIL || '',
      password: process.env.MASSAGEMHUB_ADMIN_PASSWORD || ''
    }
  };
}
