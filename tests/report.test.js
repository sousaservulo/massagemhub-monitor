import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReport } from '../src/report.js';

test('gera resumo OK', () => {
  const text = buildReport({
    checkedAt: '2026-08-28T09:00:00.000Z',
    robotsOk: true,
    sitemapOk: true,
    sitemapUrls: 30,
    pageResults: [{ durationMs: 200 }, { durationMs: 400 }],
    issues: []
  });
  assert.match(text, /TUDO OK/);
  assert.match(text, /30 URLs/);
});

test('gera alerta crítico', () => {
  const text = buildReport({
    checkedAt: '2026-08-28T09:00:00.000Z',
    robotsOk: false,
    sitemapOk: true,
    sitemapUrls: 30,
    pageResults: [{ durationMs: 200 }],
    issues: [{ level: 'critical', message: 'Site fora', url: 'https://massagemhub.com.br' }]
  });
  assert.match(text, /ALERTA CRÍTICO/);
  assert.match(text, /Site fora/);
});
