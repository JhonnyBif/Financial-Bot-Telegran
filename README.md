# Finance Telegram Bot

Bot pessoal para registrar despesas e recebimentos pelo Telegram e salvá-los em uma planilha do Google Sheets. A aplicação roda como um [Cloudflare Worker](https://developers.cloudflare.com/workers/) e aceita somente usuários explicitamente autorizados.

## Como funciona

```text
Telegram
   │ POST /telegram/webhook
   ▼
Cloudflare Worker ── valida webhook e usuário
   │
   ├── interpreta valor, banco, descrição e data
   ├── grava o lançamento no Google Sheets
   └── responde ao usuário pela Telegram Bot API
```

Principais recursos:

- despesas e recebimentos em reais;
- datas no formato brasileiro, com o fuso `America/Sao_Paulo` como padrão;
- aliases para contas Nubank e Inter, PF e PJ;
- separação dos lançamentos em abas mensais;
- allowlist de usuários do Telegram;
- validação do segredo enviado pelo webhook;
- comandos `/start` e `/help`;
- testes automatizados do parser de transações.

## Formato das mensagens

### Despesas

```text
<valor> <banco> <descrição> [data]
```

Exemplos:

```text
15 nc Youtube Premium
29,90 pix Mercado Livre 10/07
R$1.299,90 ic Notebook 05/07/2026
86,05 nc pj DAS MEI
```

### Recebimentos

```text
recebido <valor> <descrição> [data]
r <valor> <descrição> [data]
```

Exemplos:

```text
r 500 Freela
recebido 4500 Salário 05/07/2026
```

A data é opcional. Sem ano, o bot usa o ano atual; sem data, usa o dia atual em São Paulo.

### Aliases bancários

| Alias | Conta registrada |
| --- | --- |
| `nc` | Nubank Crédito PF |
| `pix` ou `np` | Nubank Pix PF |
| `nc pj` ou `njc` | Nubank Crédito PJ |
| `pix pj` ou `njp` | Nubank Pix PJ |
| `ic` | Inter Crédito PF |
| `ip` | Inter Pix PF |

## Estrutura esperada da planilha

Cada mês precisa ter uma aba já criada com o nome `Mês MM.AA`, por exemplo `Mês 07.26`. O bot não cria abas automaticamente.

Os dados começam na linha 9 e podem ocupar até a linha 2000:

| Tipo | Colunas | Conteúdo |
| --- | --- | --- |
| Despesa | `A:D` | banco, descrição, valor e data |
| Recebimento | `F:H` | descrição, valor e data |

O ID da planilha é o trecho entre `/d/` e `/edit` na URL do Google Sheets:

```text
https://docs.google.com/spreadsheets/d/ESTE_E_O_ID/edit
```

## Pré-requisitos

- Node.js 22 ou superior;
- npm;
- uma conta Cloudflare;
- um bot criado pelo [BotFather](https://t.me/BotFather);
- um projeto no Google Cloud com a [Google Sheets API](https://developers.google.com/workspace/sheets/api/quickstart/nodejs) habilitada;
- uma planilha preparada no formato descrito acima.

## Instalação

```bash
git clone <url-do-repositorio>
cd finance-telegram-bot
npm install
```

Crie os arquivos locais a partir dos exemplos:

```bash
cp .env.example .env
cp .dev.vars.example .dev.vars
```

No PowerShell, use:

```powershell
Copy-Item .env.example .env
Copy-Item .dev.vars.example .dev.vars
```

Os arquivos `.env` e `.dev.vars` são ignorados pelo Git. Nunca versione tokens ou credenciais.

## Configuração do Google OAuth

1. No Google Cloud, habilite a Google Sheets API e configure a tela de consentimento OAuth.
2. Crie um cliente OAuth do tipo **Aplicativo da Web**.
3. Adicione `http://localhost:3000/oauth2callback` aos URIs de redirecionamento autorizados.
4. Preencha `.env`:

```dotenv
GOOGLE_CLIENT_ID=seu-client-id
GOOGLE_CLIENT_SECRET=seu-client-secret
```

5. Gere o refresh token:

```bash
npm run google:oauth
```

6. Abra a URL exibida, autorize o acesso e copie o campo `refresh_token` da resposta mostrada no terminal.

O script solicita o escopo completo de planilhas (`https://www.googleapis.com/auth/spreadsheets`) porque o bot lê, grava e formata células.

## Variáveis de ambiente

Preencha `.dev.vars` para desenvolvimento local:

```dotenv
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
ALLOWED_TELEGRAM_USER_IDS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_SHEET_ID=
```

| Variável | Descrição |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | token fornecido pelo BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | segredo compartilhado com o webhook do Telegram |
| `ALLOWED_TELEGRAM_USER_IDS` | IDs numéricos autorizados, separados por vírgula |
| `GOOGLE_CLIENT_ID` | client ID do OAuth no Google Cloud |
| `GOOGLE_CLIENT_SECRET` | client secret do OAuth |
| `GOOGLE_REFRESH_TOKEN` | refresh token gerado pelo script local |
| `GOOGLE_SHEET_ID` | ID da planilha de destino |

Exemplo de allowlist:

```dotenv
ALLOWED_TELEGRAM_USER_IDS=123456789,987654321
```

O `TELEGRAM_WEBHOOK_SECRET` deve ter de 1 a 256 caracteres e usar apenas letras, números, `_` e `-`, conforme a [Telegram Bot API](https://core.telegram.org/bots/api#setwebhook).

### Descobrindo o ID de um usuário do Telegram

Antes de configurar o webhook, envie uma mensagem para o bot e consulte as atualizações pendentes:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates"
```

Use o valor numérico de `result[].message.from.id` em `ALLOWED_TELEGRAM_USER_IDS`. O método `getUpdates` deixa de funcionar enquanto um webhook estiver ativo; nesse caso, remova temporariamente o webhook ou consulte o ID por outro bot confiável.

## Desenvolvimento local

Inicie o Worker:

```bash
npm run dev
```

Por padrão, ele fica disponível em `http://localhost:8787`. Verifique a aplicação com:

```bash
curl http://localhost:8787/health
```

Para receber webhooks do Telegram durante o desenvolvimento, exponha o servidor local por uma URL HTTPS pública e cadastre essa URL conforme a seção seguinte.

## Deploy

Autentique o Wrangler:

```bash
npx wrangler login
```

Cadastre cada valor de produção como um [secret do Cloudflare Workers](https://developers.cloudflare.com/workers/configuration/secrets/):

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put ALLOWED_TELEGRAM_USER_IDS
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npx wrangler secret put GOOGLE_SHEET_ID
```

Depois publique o Worker:

```bash
npm run deploy
```

O Wrangler exibirá a URL pública, normalmente no formato `https://finance-telegram-bot.<subdominio>.workers.dev`.

## Configuração do webhook do Telegram

Com o Worker publicado, registre o endpoint e use exatamente o mesmo segredo configurado em `TELEGRAM_WEBHOOK_SECRET`:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<url-do-worker>/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message"]
  }'
```

Consulte o estado do webhook:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## Rotas

| Método | Rota | Finalidade |
| --- | --- | --- |
| `GET` | `/` | página inicial |
| `GET` | `/privacy` | política de privacidade |
| `GET` | `/terms` | termos de uso |
| `GET` | `/health` | verificação de saúde do serviço |
| `POST` | `/telegram/webhook` | recebimento de atualizações do Telegram |

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | inicia o Worker localmente |
| `npm run deploy` | publica no Cloudflare Workers |
| `npm test` | executa os testes em modo interativo |
| `npm test -- --run` | executa os testes uma vez |
| `npm run google:oauth` | gera a autorização OAuth do Google |
| `npm run cf-typegen` | atualiza os tipos gerados pelo Wrangler |

Após alterar bindings em `wrangler.jsonc`, execute `npm run cf-typegen`.

## Estrutura do projeto

```text
src/
├── app.ts                    # roteamento HTTP
├── env.ts                    # bindings e variáveis do Worker
├── public/                   # páginas públicas
├── sheets/                   # leitura e escrita no Google Sheets
├── shared/                   # datas, valores monetários e erros
├── telegram/                 # webhook, autenticação e Telegram API
└── transactions/             # parser, aliases e formatação
scripts/
├── google-oauth.ts           # fluxo OAuth executado localmente
└── google/                   # renovação do access token
test/
└── transaction.parser.test.ts
```

## Testes

Execute toda a suíte uma vez:

```bash
npm test -- --run
```

Os testes atuais cobrem o parser de despesas e recebimentos, valores em BRL, datas, aliases bancários e erros de validação.
