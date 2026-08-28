import { sendTelegram } from './telegram.js';

function normalizeUrl(base, value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${base.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
}

function meta(html, name) {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i');
  const match = html.match(re);
  return (match?.[1] || match?.[2] || '').trim();
}

async function main() {
  const configured = process.env.MASSAGEMHUB_SENTINEL_PUBLIC_URL;
  if (!configured) {
    console.log('Conta sentinela não configurada: MASSAGEMHUB_SENTINEL_PUBLIC_URL ausente. Checagem pulada.');
    return;
  }

  const base = process.env.MASSAGEMHUB_BASE_URL || 'https://massagemhub.com.br';
  const url = normalizeUrl(base, configured);
  const expected = process.env.MASSAGEMHUB_SENTINEL_EXPECT || '';
  const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'MassagemHub-Monitor/3.0' } });
  const html = await response.text();
  const robots = meta(html, 'robots').toLowerCase();
  const issues = [];

  if (!response.ok) issues.push(`HTTP ${response.status}`);
  if (expected && !html.toLowerCase().includes(expected.toLowerCase())) issues.push(`Texto esperado não encontrado: ${expected}`);
  if (robots.includes('noindex')) issues.push('Perfil sentinela está com noindex');

  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
  const header = issues.length ? 'MASSAGEMHUB SENTINELA — ATENÇÃO' : 'MASSAGEMHUB SENTINELA — OK';
  const lines = [header, '', `URL: ${url}`, `HTTP: ${response.status}`, `Title: ${title || '(ausente)'}`, `Indexável: ${robots.includes('noindex') ? 'NÃO' : 'SIM'}`];
  if (issues.length) lines.push('', ...issues.map(i => `• ${i}`));
  const text = lines.join('\n');
  console.log(text);
  await sendTelegram(text);
  if (issues.length) process.exitCode = 1;
}

main().catch(async error => {
  const text = `MASSAGEMHUB SENTINELA — ERRO\n\n${error?.stack || error}`;
  console.error(text);
  try { await sendTelegram(text); } catch {}
  process.exitCode = 1;
});
