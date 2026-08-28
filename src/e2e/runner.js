import fs from 'node:fs/promises';
import path from 'node:path';

function record(results, name, status, message = '') {
  results.push({ name, status, message });
}

async function maybeScreenshot(page, config, name) {
  if (!config.screenshots) return;
  await fs.mkdir(path.resolve('artifacts/e2e'), { recursive: true });
  const safe = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  await page.screenshot({ path: path.resolve(`artifacts/e2e/${safe}.png`), fullPage: true });
}

function containsExpected(text, route) {
  if (route.expect) return text.includes(route.expect);
  if (route.expectAny) return route.expectAny.some(value => text.includes(value));
  return true;
}

async function checkPage(page, config, route, results) {
  const name = route.name;
  try {
    const response = await page.goto(`${config.baseUrl}${route.path}`, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeoutMs
    });
    const status = response?.status() || 0;
    if (!response || status >= 500 || status === 0) {
      await maybeScreenshot(page, config, name);
      record(results, name, 'failed', `HTTP ${status || 'sem resposta'} em ${route.path}`);
      return false;
    }

    const body = await page.locator('body').innerText({ timeout: config.timeoutMs });
    if (!containsExpected(body, route)) {
      await maybeScreenshot(page, config, name);
      record(results, name, 'failed', `Conteúdo esperado não encontrado em ${route.path}`);
      return false;
    }

    record(results, name, 'ok', `HTTP ${status}`);
    return true;
  } catch (error) {
    try { await maybeScreenshot(page, config, name); } catch {}
    record(results, name, 'failed', error.message);
    return false;
  }
}

async function login(page, config, kind, credentials, results) {
  const isAdmin = kind === 'admin';
  const name = isAdmin ? 'Login autenticado do admin' : 'Login autenticado do anunciante';
  const loginPath = isAdmin ? '/admin/login' : '/anunciante/login';
  const expectedPrefix = isAdmin ? '/admin' : '/anunciante';

  if (!credentials.email || !credentials.password) {
    record(results, name, 'skipped', 'Secrets da conta de monitoramento não configurados');
    return false;
  }

  try {
    await page.goto(`${config.baseUrl}${loginPath}`, { waitUntil: 'domcontentloaded', timeout: config.timeoutMs });
    await page.locator('input[name="email"]').fill(credentials.email);
    await page.locator('input[name="password"]').fill(credentials.password);

    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      page.locator('button[type="submit"]').click()
    ]);

    const current = new URL(page.url());
    const remainedOnLogin = current.pathname.includes('/login');
    const body = await page.locator('body').innerText();
    const hasCredentialError = /credenciais|senha|incorret|inválid|invalid/i.test(body) && remainedOnLogin;

    if (remainedOnLogin || hasCredentialError || !current.pathname.startsWith(expectedPrefix)) {
      // Não salva screenshot aqui para evitar registrar e-mail/erros de autenticação em artifacts.
      record(results, name, 'failed', `Login não concluiu; permaneceu em ${current.pathname}`);
      return false;
    }

    record(results, name, 'ok', `Sessão aberta em ${current.pathname}`);
    return true;
  } catch (error) {
    record(results, name, 'failed', error.message);
    return false;
  }
}

async function checkAdvertiserPhotoControls(page, config, results) {
  const name = 'Controles de fotos do anunciante';
  try {
    const response = await page.goto(`${config.baseUrl}/anunciante/meu-anuncio`, { waitUntil: 'domcontentloaded', timeout: config.timeoutMs });
    if (!response || response.status() >= 500) {
      record(results, name, 'failed', `HTTP ${response?.status() || 'sem resposta'}`);
      return;
    }

    const forms = page.locator('form[action*="/fotos/"][action$="/principal"]');
    const primaryButtons = await forms.count();
    const uploadInput = page.locator('input[type="file"]');
    const uploadInputs = await uploadInput.count();

    // Um perfil pode ter apenas uma foto principal e, nesse caso, não existir botão para troca.
    // O objetivo aqui é confirmar que a área de fotos renderizou sem 500/erro de frontend.
    const body = await page.locator('body').innerText();
    const hasPhotoSection = /foto/i.test(body) || uploadInputs > 0 || primaryButtons > 0;
    if (!hasPhotoSection) {
      record(results, name, 'failed', 'A seção de fotos não foi encontrada');
      return;
    }

    record(results, name, 'ok', `${primaryButtons} opção(ões) para definir principal; ${uploadInputs} campo(s) de upload`);
  } catch (error) {
    record(results, name, 'failed', error.message);
  }
}

export async function runE2E(browser, config) {
  const results = [];

  // Páginas de login sempre são testadas, mesmo sem credenciais.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    for (const route of config.routes.public) await checkPage(page, config, route, results);
    await context.close();
  }

  // Área do anunciante em sessão isolada.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const authenticated = await login(page, config, 'advertiser', config.advertiser, results);
    if (authenticated) {
      for (const route of config.routes.advertiser) await checkPage(page, config, route, results);
      await checkAdvertiserPhotoControls(page, config, results);
    } else if (!config.advertiser.email || !config.advertiser.password) {
      for (const route of config.routes.advertiser) record(results, route.name, 'skipped', 'Depende da conta de monitoramento do anunciante');
      record(results, 'Controles de fotos do anunciante', 'skipped', 'Depende da conta de monitoramento do anunciante');
    }
    await context.close();
  }

  // Admin em sessão isolada.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const authenticated = await login(page, config, 'admin', config.admin, results);
    if (authenticated) {
      for (const route of config.routes.admin) await checkPage(page, config, route, results);
    } else if (!config.admin.email || !config.admin.password) {
      for (const route of config.routes.admin) record(results, route.name, 'skipped', 'Depende da conta de monitoramento do admin');
    }
    await context.close();
  }

  return { checkedAt: new Date().toISOString(), results };
}
