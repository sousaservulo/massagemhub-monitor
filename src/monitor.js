import { request } from './http.js';
import { analyzeHtml, isNoindex, normalizeUrl } from './seo.js';
import { inspectSitemap, pickSampleUrls } from './sitemap.js';

const MAX_IMAGES_PER_PAGE = 12;

function result(level, type, url, message, extra = {}) {
  return { level, type, url, message, ...extra };
}

async function checkImages(images, timeoutMs) {
  const failures = [];
  for (const imageUrl of images.slice(0, MAX_IMAGES_PER_PAGE)) {
    const response = await request(imageUrl, { timeoutMs, method: 'HEAD' });
    if (!response.ok) {
      // Alguns CDNs/servidores não aceitam HEAD: confirma com GET antes de acusar falha.
      const fallback = await request(imageUrl, { timeoutMs, method: 'GET' });
      if (!fallback.ok) failures.push({ url: imageUrl, status: fallback.status, error: fallback.error });
    }
  }
  return failures;
}

export async function runMonitor(config) {
  const issues = [];
  const pageResults = [];

  // robots.txt
  const robotsUrl = `${config.baseUrl}/robots.txt`;
  const robots = await request(robotsUrl, { timeoutMs: config.timeoutMs });
  if (!robots.ok) {
    issues.push(result('critical', 'robots', robotsUrl, `robots.txt indisponível (${robots.status || robots.error})`));
  } else {
    if (/Disallow:\s*\/\s*$/im.test(robots.body)) {
      issues.push(result('critical', 'robots', robotsUrl, 'robots.txt está bloqueando todo o site com Disallow: /'));
    }
    if (!new RegExp(`Sitemap:\\s*${config.baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/sitemap\\.xml`, 'i').test(robots.body)) {
      issues.push(result('warning', 'robots', robotsUrl, 'robots.txt não referencia o sitemap.xml esperado'));
    }
  }

  // sitemap.xml e sitemaps filhos
  const sitemap = await inspectSitemap(config.baseUrl, config.timeoutMs);
  if (!sitemap.ok) {
    issues.push(result('critical', 'sitemap', sitemap.rootUrl, `Sitemap com falha (${sitemap.status || sitemap.error || 'erro em sitemap filho'})`));
    for (const error of sitemap.childErrors || []) {
      issues.push(result('critical', 'sitemap-child', error.url, `Sitemap filho com falha (${error.status || error.error})`));
    }
  } else if (sitemap.urls.length === 0) {
    issues.push(result('warning', 'sitemap', sitemap.rootUrl, 'Sitemap não contém URLs indexáveis'));
  }

  const configuredUrls = config.criticalPages.map(path => new URL(path, `${config.baseUrl}/`).href);
  const sampleUrls = config.sampleFromSitemap?.enabled
    ? pickSampleUrls(sitemap.urls, config.sampleFromSitemap)
    : [];
  const urls = [...new Set([...configuredUrls, ...sampleUrls])];

  const alwaysIndexable = new Set(config.alwaysIndexablePages.map(path => normalizeUrl(new URL(path, `${config.baseUrl}/`).href)));
  const conditionalIndexable = new Set(config.conditionalIndexablePages.map(path => normalizeUrl(new URL(path, `${config.baseUrl}/`).href)));
  const sitemapSet = new Set(sitemap.urls.map(url => normalizeUrl(url)));

  for (const url of urls) {
    const response = await request(url, { timeoutMs: config.timeoutMs });
    if (!response.ok) {
      issues.push(result('critical', 'page', url, `Página indisponível (${response.status || response.error})`, { durationMs: response.durationMs }));
      pageResults.push({ url, status: response.status, durationMs: response.durationMs, ok: false });
      continue;
    }

    const seo = analyzeHtml(response.body, response.finalUrl);
    const normalized = normalizeUrl(response.finalUrl);
    const shouldAlwaysIndex = alwaysIndexable.has(normalized);
    const isConditional = conditionalIndexable.has(normalized);
    const listedInSitemap = sitemapSet.has(normalized);

    if (!seo.title) issues.push(result('warning', 'seo', url, 'Página sem <title>'));
    if (!seo.description) issues.push(result('warning', 'seo', url, 'Página sem meta description'));
    if (!seo.canonical) {
      issues.push(result('warning', 'seo', url, 'Página sem canonical'));
    } else if (normalizeUrl(seo.canonical) !== normalized) {
      issues.push(result('warning', 'seo', url, `Canonical aponta para outra URL: ${seo.canonical}`));
    }

    if (shouldAlwaysIndex && isNoindex(seo.robots)) {
      issues.push(result('critical', 'seo', url, `Página crítica está com noindex (${seo.robots || 'sem meta robots'})`));
    }

    // Estado/cidade só deve indexar se houver resultados públicos; o próprio sitemap define a expectativa.
    if (isConditional && listedInSitemap && isNoindex(seo.robots)) {
      issues.push(result('critical', 'seo', url, 'Página está no sitemap, mas o HTML informa noindex'));
    }
    if (isConditional && !listedInSitemap && seo.robots && !isNoindex(seo.robots)) {
      issues.push(result('warning', 'seo', url, 'Página não está no sitemap, mas o HTML permite indexação'));
    }

    // Toda página amostrada diretamente do sitemap precisa ser indexável.
    if (sampleUrls.includes(url) && isNoindex(seo.robots)) {
      issues.push(result('critical', 'seo', url, 'URL encontrada no sitemap está com noindex'));
    }

    const imageFailures = await checkImages(seo.images, Math.min(config.timeoutMs, 10000));
    for (const image of imageFailures.slice(0, 3)) {
      issues.push(result('warning', 'image', url, `Imagem quebrada (${image.status || image.error}): ${image.url}`));
    }

    pageResults.push({
      url,
      status: response.status,
      durationMs: response.durationMs,
      ok: true,
      title: seo.title,
      robots: seo.robots,
      imagesChecked: Math.min(seo.images.length, MAX_IMAGES_PER_PAGE),
      imageFailures: imageFailures.length,
      listedInSitemap
    });
  }

  return {
    checkedAt: new Date().toISOString(),
    baseUrl: config.baseUrl,
    robotsOk: robots.ok,
    sitemapOk: sitemap.ok,
    sitemapFiles: sitemap.sitemapFiles?.length || 0,
    sitemapUrls: sitemap.urls?.length || 0,
    pageResults,
    issues
  };
}
