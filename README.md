# MassagemHub Monitor — Pacote 3.1

— Pacotes 1 + 2

Monitor externo do MassagemHub executado pelo GitHub Actions **4 vezes ao dia**, com relatórios no Telegram.

## Pacote 1 — SEO e saúde

Verifica diretamente o site, sem gerar pesquisas ou cliques artificiais:

- HTTP das páginas críticas;
- `robots.txt`;
- `sitemap.xml` e sitemaps filhos;
- title, description, canonical e meta robots;
- inconsistência `sitemap + noindex`;
- páginas de estado/cidade condicionais;
- amostra automática de terapeutas, clínicas e páginas do guia;
- imagens quebradas;
- tempo de resposta.

## Pacote 2 — Navegador E2E

Usa **Playwright + Chromium headless** para verificar o comportamento real da aplicação.

### Sempre testado

- `/anunciante/login`;
- `/admin/login`.

### Com conta de monitoramento do anunciante

- login real;
- `/anunciante`;
- `/anunciante/meu-anuncio`;
- `/anunciante/financeiro`;
- renderização da seção de fotos;
- presença dos controles para definir foto principal quando aplicável.

O teste **não envia formulários de edição, não troca foto, não exclui foto e não altera dados**.

### Com conta de Admin

- login real;
- `/admin`;
- `/admin/therapists`;
- `/admin/clinics`;
- `/admin/telegram`.

Também são apenas acessos de leitura/navegação.

## Horários

Configurado para:

- 00:00
- 06:00
- 12:00
- 18:00

Horário de Brasília/Fortaleza (UTC-3). Também é possível usar **Actions > MassagemHub Monitor > Run workflow**.

## Secrets já existentes

No GitHub:

`Settings > Secrets and variables > Actions`

Mantenha:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_MONITOR_CHAT_ID`
- `TELEGRAM_MONITOR_TOPIC_ID` (opcional)

## Novos Secrets do Pacote 2

Para habilitar os testes autenticados:

- `MASSAGEMHUB_ADVERTISER_EMAIL`
- `MASSAGEMHUB_ADVERTISER_PASSWORD`
- `MASSAGEMHUB_ADMIN_EMAIL`
- `MASSAGEMHUB_ADMIN_PASSWORD`

Os valores ficam somente em **GitHub Secrets**. Não coloque credenciais no `.env` versionado, no código ou no README.

É recomendável usar uma conta de anunciante criada especificamente para monitoramento. O Admin pode ser uma conta com acesso suficiente para abrir as telas verificadas.

Se os Secrets de autenticação não existirem, o workflow **não quebra**: as páginas públicas de login são verificadas e os testes autenticados aparecem como `PULADO`.

## Screenshots

Por padrão:

`E2E_SCREENSHOTS=false`

Isso evita armazenar imagens de telas administrativas/anunciantes no GitHub. Se você decidir ativar, altere para `true` no workflow. Em falhas, os arquivos são enviados como artifact por 7 dias.

Mesmo com screenshots ativados, o monitor não captura a tela de login após falha de autenticação, para evitar registrar o e-mail digitado.

## GitHub Actions

O workflow possui dois jobs independentes:

1. **SEO e saúde** — Pacote 1;
2. **Navegador E2E** — Pacote 2.

Assim uma falha crítica do SEO não impede a execução dos testes de navegador e vice-versa.

### Correção incluída

A configuração antiga usava `cache: npm` sem possuir `package-lock.json`, causando:

`Dependencies lock file is not found`

O Pacote 2 já remove essa configuração, portanto essa falha não deve se repetir.

## Instalação do Playwright

O GitHub Actions executa automaticamente:

```bash
npm install --no-audit --no-fund
npx playwright install --with-deps chromium
```

Não é necessário instalar Chromium manualmente no runner.

## Executar localmente

```bash
npm install
npx playwright install chromium
npm test
npm run monitor
npm run e2e
```

Sem as credenciais de autenticação, o `npm run e2e` apenas testa as páginas públicas e pula as áreas protegidas.

## Configuração das páginas E2E

As rotas ficam em:

`config/e2e.json`

Isso permite adicionar novas telas posteriormente sem reescrever o motor do monitor.

## Telegram

O Pacote 1 envia um relatório de SEO/saúde e o Pacote 2 envia um relatório E2E separado. Exemplos:

```text
MASSAGEMHUB E2E — TUDO OK

Testes OK: 11
Falhas: 0
Pulados: 0
```

ou:

```text
MASSAGEMHUB E2E — ALERTA

[OK] Login autenticado do anunciante
[FALHA] Meu anúncio
  HTTP 500 em /anunciante/meu-anuncio
```

Uma falha E2E deixa o job vermelho e envia a informação para o Telegram.


## Pacote 3.1

Corrige o login E2E do Admin e do anunciante para usar o botão acessível `Entrar`, compatível com os formulários reais do MassagemHub, que não definem explicitamente `type="submit"`.
