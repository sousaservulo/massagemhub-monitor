import { chromium } from 'playwright';
import { loadE2EConfig } from './config.js';
import { runE2E } from './runner.js';
import { buildE2EReport } from './report.js';
import { sendTelegram } from '../telegram.js';

async function main() {
  const config = await loadE2EConfig();
  const browser = await chromium.launch({ headless: true });

  try {
    const report = await runE2E(browser, config);
    const text = buildE2EReport(report);
    console.log(text);
    await sendTelegram(text);

    if (report.results.some(item => item.status === 'failed')) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch(async error => {
  const text = `MASSAGEMHUB E2E — ERRO INTERNO\n\n${error?.stack || error}`;
  console.error(text);
  try { await sendTelegram(text); } catch (telegramError) { console.error(telegramError); }
  process.exitCode = 1;
});
