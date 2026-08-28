const USER_AGENT = 'MassagemHubHealthMonitor/1.0 (+https://massagemhub.com.br)';

export async function request(url, { timeoutMs = 15000, method = 'GET' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        'accept': method === 'HEAD' ? '*/*' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      durationMs: Date.now() - startedAt,
      headers: response.headers,
      body: method === 'HEAD' ? '' : await response.text()
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      durationMs: Date.now() - startedAt,
      headers: new Headers(),
      body: '',
      error: error?.name === 'AbortError' ? 'timeout' : (error?.message || String(error))
    };
  } finally {
    clearTimeout(timer);
  }
}
