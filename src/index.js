import { loadConfig } from './config.js';
import { runMonitor } from './monitor.js';
import { buildReport } from './report.js';
import { sendTelegram } from './telegram.js';

async function main() {
  const config = await loadConfig();
  const report = await runMonitor(config);
  const text = buildReport(report);

  console.log(text);

  if (report.issues.length > 0 || config.sendSuccessSummary) {
    await sendTelegram(text);
  }

  // Falha o workflow apenas em indisponibilidade/SEO crítico, não em avisos leves.
  if (report.issues.some(issue => issue.level === 'critical')) {
    process.exitCode = 1;
  }
}

main().catch(async error => {
  const text = `MASSAGEMHUB MONITOR — ERRO INTERNO\n\n${error?.stack || error}`;
  console.error(text);
  try { await sendTelegram(text); } catch (telegramError) { console.error(telegramError); }
  process.exitCode = 1;
});
