# MassagemHub Monitor 

Monitor externo do MassagemHub executado pelo GitHub Actions **4 vezes ao dia**, com relatórios no Telegram. O projeto não pesquisa no Google, não clica em anúncios e não gera tráfego artificial.

## SEO e saúde

Verifica diretamente o site:

- HTTP das páginas críticas;
- `robots.txt`;
- `sitemap.xml` e sitemaps filhos;
- title, description, canonical e meta robots;
- inconsistência `sitemap + noindex`;
- páginas de estado/cidade condicionais;
- amostra automática de terapeutas, clínicas e páginas do guia;
- imagens quebradas;
- tempo de resposta.

## Navegador E2E

Usa **Playwright + Chromium headless** para verificar o comportamento real da aplicação.

### Sempre testado

- `/anunciante/login`;
- `/admin/login`.

### Com conta do anunciante

- login real;
- `/anunciante`;
- `/anunciante/meu-anuncio`;
- `/anunciante/financeiro`;
- seção de fotos;
- controles para definir foto principal quando aplicável.

O teste **não envia formulários de edição, não troca foto, não exclui foto e não altera dados**.

### Com conta de Admin

- login real;
- `/admin`;
- `/admin/therapists`;
- `/admin/clinics`;
- `/admin/telegram`.

Também são somente acessos de leitura/navegação.

## SEO inteligente e sentinela

### Google Search Console

Integração opcional, somente leitura, com a Search Console API. A cada execução calcula duas janelas consecutivas de 7 dias, encerrando em D-2 para reduzir o efeito do atraso de consolidação do Google.

O relatório no Telegram informa:

- cliques dos últimos 7 dias e variação contra os 7 anteriores;
- impressões e variação;
- CTR;
- posição média;
- top páginas por cliques;
- top consultas por cliques;
- quantidade de sitemaps cadastrados e sitemaps com erro/aviso;
- alertas de quedas relevantes.

Os limites padrão evitam alertas por oscilações pequenas:

- queda de impressões: 40%, apenas quando o período anterior tinha pelo menos 50 impressões;
- queda de cliques: 50%, apenas quando o período anterior tinha pelo menos 10 cliques;
- piora de posição média: 5 posições, respeitando o volume mínimo.

Por padrão, uma queda gera **aviso no Telegram, mas não deixa o workflow vermelho** (`GSC_FAIL_ON_ALERT=false`). Erros de autenticação/API continuam deixando o job vermelho.

### Perfil sentinela

Permite escolher um dos perfis de exemplo já existentes e tratá-lo como referência pública. É opcional e não precisa criar outro anunciante.

Quando configurado, valida:

- HTTP 200;
- carregamento do perfil público;
- `title`;
- ausência de `noindex`;
- presença opcional de um texto esperado, como o nome do perfil de exemplo.

Use **Repository variables**, pois a URL e o texto do perfil não são credenciais:

- `MASSAGEMHUB_SENTINEL_PUBLIC_URL` — exemplo: `/terapeutas/rn/natal/nome-do-perfil`;
- `MASSAGEMHUB_SENTINEL_EXPECT` — exemplo: nome público do perfil.

Se a variável não existir, o job aparece como sucesso e informa que a checagem foi pulada.

## Horários

Configurado para:

- 00:00
- 06:00
- 12:00
- 18:00

Horário de Brasília/Fortaleza (UTC-3). Também é possível executar manualmente em **Actions > MassagemHub Monitor > Run workflow**.

## Secrets do Telegram

Em `Settings > Secrets and variables > Actions`:

- `TELEGRAM_BOT_TOKEN`;
- `TELEGRAM_MONITOR_CHAT_ID`;
- `TELEGRAM_MONITOR_TOPIC_ID` (opcional).

## Secrets

Todos opcionais:

- `MASSAGEMHUB_ADVERTISER_EMAIL`;
- `MASSAGEMHUB_ADVERTISER_PASSWORD`;
- `MASSAGEMHUB_ADMIN_EMAIL`;
- `MASSAGEMHUB_ADMIN_PASSWORD`.

Sem credenciais, os testes autenticados são marcados como `PULADO` em vez de falhar.

## Configurando o Google Search Console — Pacote 3

A integração usa **Service Account** e permissão somente leitura.

1. No Google Cloud, crie ou use um projeto e habilite a **Google Search Console API**.
2. Crie uma **Service Account**.
3. Gere uma chave JSON para essa Service Account.
4. Copie o e-mail `client_email` presente no JSON.
5. No Google Search Console, abra a propriedade do MassagemHub e adicione esse e-mail como usuário com permissão de leitura suficiente para consultar os dados.
6. No GitHub, crie o Secret `GOOGLE_SERVICE_ACCOUNT_JSON` e cole **todo o conteúdo do JSON** da chave como valor.

Nunca coloque esse JSON no repositório, `.env`, commit ou README.

A propriedade padrão usada pelo workflow é:

```text
sc-domain:massagemhub.com.br
```

Se a propriedade cadastrada no Search Console for do tipo URL Prefix em vez de Domain Property, altere `GSC_SITE_URL` no workflow para o valor exato da propriedade, por exemplo `https://massagemhub.com.br/`.

Se `GOOGLE_SERVICE_ACCOUNT_JSON` não estiver configurado, o job é pulado com sucesso. Portanto você pode subir e testar o Pacote 3 antes de configurar a API.

## Jobs do GitHub Actions

O workflow possui quatro jobs independentes:

1. **SEO e saúde** — Pacote 1;
2. **Perfil sentinela** — Pacote 3, opcional;
3. **Navegador E2E** — Pacote 2;
4. **Google Search Console** — Pacote 3, opcional.

Uma falha de um módulo não impede os demais de executarem.

## Screenshots E2E

Por padrão:

```text
E2E_SCREENSHOTS=false
```

Isso evita armazenar telas administrativas/anunciantes no GitHub. Se ativado, screenshots de falhas são mantidos como artifact por 7 dias. O monitor evita screenshot da tela após falha de autenticação para não registrar o e-mail digitado.

## Executar localmente

```bash
npm install
npx playwright install chromium
npm test
npm run monitor
npm run sentinel
npm run e2e
npm run gsc
```

`sentinel` e `gsc` encerram normalmente quando suas configurações opcionais não existem.

## Configuração das páginas E2E

As rotas ficam em:

```text
config/e2e.json
```

Isso permite adicionar novas telas posteriormente sem reescrever o motor.
