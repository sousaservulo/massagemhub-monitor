import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHtml, isNoindex, normalizeUrl } from '../src/seo.js';

test('extrai metadados SEO e imagens', () => {
  const html = `
    <html><head>
      <title>MassagemHub</title>
      <meta name="description" content="Descrição">
      <meta name="robots" content="index, follow">
      <link rel="canonical" href="/terapeutas/rn/natal">
    </head><body><img src="/foto.webp"><img src="data:image/png;base64,AAA"></body></html>`;

  const result = analyzeHtml(html, 'https://massagemhub.com.br/terapeutas/rn/natal');
  assert.equal(result.title, 'MassagemHub');
  assert.equal(result.description, 'Descrição');
  assert.equal(result.robots, 'index, follow');
  assert.equal(result.canonical, 'https://massagemhub.com.br/terapeutas/rn/natal');
  assert.deepEqual(result.images, ['https://massagemhub.com.br/foto.webp']);
});

test('detecta noindex', () => {
  assert.equal(isNoindex('noindex, follow'), true);
  assert.equal(isNoindex('index, follow'), false);
});

test('normaliza barra final e hash', () => {
  assert.equal(normalizeUrl('https://massagemhub.com.br/clinicas/rn/#x'), 'https://massagemhub.com.br/clinicas/rn');
});
