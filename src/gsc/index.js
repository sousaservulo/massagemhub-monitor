import { parseServiceAccount, getAccessToken } from './auth.js';
import { querySearchAnalytics, listSitemaps } from './client.js';
import { buildPeriods, totalsFromRows, normalizeTotals, detectAlerts } from './metrics.js';
import { buildGSCReport } from './report.js';
import { sendTelegram } from '../telegram.js';

function summarizeSitemaps(data) {
  const entries = data.sitemap || [];
  let problematic = 0;
  for (const item of entries) {
    const hasErrors = Number(item.errors || 0) > 0;
    const hasWarnings = Number(item.warnings || 0) > 0;
    if (hasErrors || hasWarnings) problematic++;
  }
  return { total: entries.length, problematic };
}

async function main() {
  const serviceAccount = parseServiceAccount(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (!serviceAccount) {
    console.log('Search Console não configurado: GOOGLE_SERVICE_ACCOUNT_JSON ausente. Job pulado com sucesso.');
    return;
  }

  const siteUrl = process.env.GSC_SITE_URL || 'sc-domain:massagemhub.com.br';
  const token = await getAccessToken(serviceAccount);
  const periods = buildPeriods();

  const common = { type: 'web', dataState: 'final', rowLimit: 25000 };
  const [recentRaw, previousRaw, pagesRaw, queriesRaw, sitemapRaw] = await Promise.all([
    querySearchAnalytics(token, siteUrl, { ...common, ...periods.recent, dimensions: ['date'] }),
    querySearchAnalytics(token, siteUrl, { ...common, ...periods.previous, dimensions: ['date'] }),
    querySearchAnalytics(token, siteUrl, { ...common, ...periods.recent, dimensions: ['page'], rowLimit: 10 }),
    querySearchAnalytics(token, siteUrl, { ...common, ...periods.recent, dimensions: ['query'], rowLimit: 10 }),
    listSitemaps(token, siteUrl)
  ]);

  const recent = normalizeTotals(totalsFromRows(recentRaw.rows));
  const previous = normalizeTotals(totalsFromRows(previousRaw.rows));
  const alerts = detectAlerts(recent, previous, {
    minImpressions: process.env.GSC_MIN_IMPRESSIONS,
    minClicks: process.env.GSC_MIN_CLICKS,
    impressionsDrop: process.env.GSC_IMPRESSIONS_DROP_PCT,
    clicksDrop: process.env.GSC_CLICKS_DROP_PCT,
    positionWorseBy: process.env.GSC_POSITION_WORSE_BY
  });

  const data = {
    periods,
    recent,
    previous,
    alerts,
    topPages: pagesRaw.rows || [],
    topQueries: queriesRaw.rows || [],
    sitemaps: summarizeSitemaps(sitemapRaw)
  };

  const text = buildGSCReport(data);
  console.log(text);
  await sendTelegram(text);
  if (alerts.length && process.env.GSC_FAIL_ON_ALERT === 'true') process.exitCode = 1;
}

main().catch(async error => {
  const text = `MASSAGEMHUB SEARCH CONSOLE — ERRO\n\n${error?.stack || error}`;
  console.error(text);
  try { await sendTelegram(text); } catch (telegramError) { console.error(telegramError); }
  process.exitCode = 1;
});
