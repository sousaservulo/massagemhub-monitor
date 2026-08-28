# MassagemHub Monitor

Monitor externo de saúde e SEO do **MassagemHub**, executado pelo GitHub Actions 4 vezes por dia e com relatórios enviados ao Telegram.

## O que esta versão monitora

- disponibilidade HTTP das páginas críticas;
- `robots.txt` e bloqueio acidental com `Disallow: /`;
- `sitemap.xml` e todos os sitemaps filhos;
- páginas importantes do MassagemHub;
- `<title>`, meta description, canonical e meta robots;
- inconsistência `URL no sitemap + noindex`;
- inconsistência de páginas de estado/cidade entre sitemap e meta robots;
- uma amostra automática de anúncios de terapeutas, clínicas e páginas do guia presentes no sitemap;
- até 12 imagens por página monitorada, detectando imagens quebradas;
- tempo médio das respostas;
- alertas e resumo pelo Telegram.

> Esta versão **não faz pesquisas no Google, não clica em anúncios e não tenta gerar tráfego artificial**. Ela acessa diretamente o MassagemHub para verificar saúde e SEO.

## Horários

O workflow está configurado para rodar diariamente às:

- 00:00
- 06:00
- 12:00
- 18:00

Horário de Fortaleza/Brasília (`UTC-3`). O cron do GitHub está convertido para UTC.

Também é possível executar manualmente em **Actions > MassagemHub Monitor > Run workflow**.

## Telegram

O monitor pode utilizar o **mesmo bot já utilizado pelo MassagemHub**. Crie um novo grupo para os relatórios do monitor, adicione o bot e configure os seguintes Secrets no novo repositório:

### Obrigatórios

`TELEGRAM_BOT_TOKEN`

Mesmo token do bot já utilizado pelo MassagemHub.

`TELEGRAM_MONITOR_CHAT_ID`

Chat ID do novo grupo do monitor.

### Opcional

`TELEGRAM_MONITOR_TOPIC_ID`

Use somente se o grupo estiver configurado como fórum e você quiser enviar os relatórios para um tópico específico.

## Como descobrir o chat ID do novo grupo

1. Crie o grupo no Telegram.
2. Adicione o bot que já é utilizado pelo MassagemHub.
3. Envie qualquer mensagem no grupo.
4. Abra no navegador, temporariamente:

   `https://api.telegram.org/botSEU_TOKEN/getUpdates`

5. Localize `chat.id` da mensagem do grupo. Grupos normalmente possuem um ID negativo, como `-100...`.
6. Salve esse valor somente como Secret no GitHub. Não coloque o token ou chat ID no código.

Se o bot já estiver consumindo updates por webhook e `getUpdates` não retornar a mensagem, obtenha o ID pelo mecanismo administrativo já usado no MassagemHub ou por um bot auxiliar de identificação de chat.

## Configurando o GitHub

Crie um repositório, por exemplo:

`massagemhub-monitor`

Depois envie estes arquivos para ele e configure:

**Settings > Secrets and variables > Actions > New repository secret**

Crie:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_MONITOR_CHAT_ID`
- opcionalmente `TELEGRAM_MONITOR_TOPIC_ID`

Não é necessário criar `.env` no GitHub Actions.

## Lista de páginas

As páginas fixas ficam em:

`config/urls.json`

A configuração inicial já contém:

- `/`
- `/terapeutas`
- `/terapeutas/rn`
- `/terapeutas/rn/natal`
- `/clinicas`
- `/clinicas/rn`
- `/clinicas/rn/natal`
- `/guia-de-massagens`
- `/anunciar`
- `/planos`

Além disso, a cada execução o monitor lê o sitemap e escolhe automaticamente algumas páginas reais de terapeutas, clínicas e do guia. Portanto, não precisamos cadastrar manualmente cada anúncio.

## Páginas de estado/cidade e `noindex`

No MassagemHub, páginas de estado/cidade podem legitimamente ficar com `noindex, follow` quando ainda não possuem resultados públicos. Por isso o monitor **não acusa automaticamente qualquer `noindex` nessas páginas**.

Ele cruza a página com o sitemap:

- se estiver no sitemap e estiver `noindex` => **crítico**;
- se não estiver no sitemap e permitir indexação => **aviso**;
- se não estiver no sitemap e estiver `noindex` => comportamento esperado.

Isso segue a lógica existente no código Laravel do MassagemHub.

## Mensagens

Sem problemas:

```text
MASSAGEMHUB MONITOR — TUDO OK

Páginas verificadas: 16
Sitemap: OK (42 URLs)
Robots: OK
Resposta média: 320 ms
Críticos: 0 | Avisos: 0

Nenhuma anomalia detectada nas páginas monitoradas.
```

Com problema:

```text
MASSAGEMHUB MONITOR — ALERTA CRÍTICO

Páginas verificadas: 16
Sitemap: OK (42 URLs)
Robots: OK
Resposta média: 410 ms
Críticos: 1 | Avisos: 0

Problemas encontrados:
[CRÍTICO] URL encontrada no sitemap está com noindex
https://massagemhub.com.br/terapeuta/rn/exemplo
```

## Executar localmente

Requer Node.js 20 ou superior.

```bash
npm install
npm test
npm run monitor
```

Sem as variáveis do Telegram, o monitor executará normalmente e mostrará o relatório no terminal, mas não tentará enviar mensagem.

## Política de falhas no GitHub Actions

- problema **crítico**: mensagem no Telegram + workflow fica vermelho;
- **aviso**: mensagem no Telegram, mas execução permanece válida;
- tudo OK: resumo no Telegram e workflow verde.

Para receber mensagem **somente quando houver problema**, altere no workflow:

```yaml
SEND_SUCCESS_SUMMARY: 'false'
```
