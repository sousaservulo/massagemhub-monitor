import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadConfig() {
  const raw = await fs.readFile(path.join(__dirname, '..', 'config', 'urls.json'), 'utf8');
  const config = JSON.parse(raw);

  return {
    ...config,
    baseUrl: (process.env.MASSAGEMHUB_BASE_URL || config.baseUrl).replace(/\/$/, ''),
    timeoutMs: Number(process.env.MONITOR_TIMEOUT_MS || 15000),
    sendSuccessSummary: String(process.env.SEND_SUCCESS_SUMMARY || 'true').toLowerCase() === 'true'
  };
}
