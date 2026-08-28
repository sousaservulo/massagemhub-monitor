import { percentChange } from './metrics.js';

function pct(v) { return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`; }
function n(v) { return Math.round(v).toLocaleString('pt-BR'); }
function p(v) { return v ? v.toFixed(1) : '-'; }

function topLines(title, rows = [], max = 5) {
  const out = ['', title];
  if (!rows.length) return [...out, 'Sem dados no período.'];
  for (const row of rows.slice(0, max)) {
    const key = row.keys?.[0] || '(sem valor)';
    out.push(`• ${key}`);
    out.push(`  ${n(row.clicks || 0)} cliques | ${n(row.impressions || 0)} imp. | pos. ${p(row.position)}`);
  }
  return out;
}

export function buildGSCReport(data) {
  const { recent, previous, periods, alerts, topPages, topQueries, sitemaps } = data;
  const lines = [
    alerts.length ? 'MASSAGEMHUB SEARCH CONSOLE — ATENÇÃO' : 'MASSAGEMHUB SEARCH CONSOLE — OK',
    '',
    `Período atual: ${periods.recent.startDate} a ${periods.recent.endDate}`,
    `Comparação: ${periods.previous.startDate} a ${periods.previous.endDate}`,
    '',
    `Cliques: ${n(recent.clicks)} (${pct(percentChange(recent.clicks, previous.clicks))})`,
    `Impressões: ${n(recent.impressions)} (${pct(percentChange(recent.impressions, previous.impressions))})`,
    `CTR: ${(recent.ctr * 100).toFixed(2)}%`,
    `Posição média: ${p(recent.position)} (anterior ${p(previous.position)})`,
    `Sitemaps no Search Console: ${sitemaps.total} | com erro/aviso: ${sitemaps.problematic}`
  ];

  if (alerts.length) {
    lines.push('', 'Alertas:');
    for (const alert of alerts) lines.push(`• ${alert}`);
  }

  lines.push(...topLines('Top páginas por cliques:', topPages));
  lines.push(...topLines('Top consultas por cliques:', topQueries));
  lines.push('', 'Fonte: Google Search Console API. Dados podem ter atraso de consolidação.');
  return lines.join('\n');
}
