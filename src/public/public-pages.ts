function htmlResponse(content: string): Response {
  return new Response(content, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=UTF-8",
    },
  });
}

function pageTemplate(
  title: string,
  content: string,
): Response {
  return htmlResponse(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />

        <!--
          Quando o Google Search Console fornecer a tag,
          coloque aqui:

          <meta
            name="google-site-verification"
            content="CODIGO_FORNECIDO_PELO_GOOGLE"
          />
        -->

        <title>${title}</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 40px 20px;

            background: #f7f7f7;
            color: #202124;

            font-family:
              Roboto,
              Arial,
              sans-serif;

            line-height: 1.6;
          }

          main {
            width: 100%;
            max-width: 760px;

            margin: 0 auto;
            padding: 40px;

            background: #ffffff;

            border-radius: 12px;
          }

          h1 {
            margin-top: 0;
          }

          h2 {
            margin-top: 32px;
          }

          nav {
            margin-top: 40px;
            padding-top: 24px;

            border-top: 1px solid #dddddd;
          }

          nav a {
            margin-right: 16px;

            color: #1a73e8;
            text-decoration: none;
          }

          nav a:hover {
            text-decoration: underline;
          }
        </style>
      </head>

      <body>
        <main>
          ${content}

          <nav>
            <a href="/">Início</a>
            <a href="/privacy">Privacidade</a>
            <a href="/terms">Termos de Uso</a>
          </nav>
        </main>
      </body>
    </html>
  `);
}

export function homePage(): Response {
  return pageTemplate(
    "Financial Bot",
    `
      <h1>Financial Bot</h1>

      <p>
        Financial Bot é uma aplicação pessoal para facilitar
        o registro de despesas e recebimentos.
      </p>

      <p>
        O aplicativo recebe lançamentos enviados através de
        um bot do Telegram e os registra em uma planilha do
        Google Sheets autorizada pelo usuário.
      </p>

      <h2>Como funciona</h2>

      <p>
        O usuário envia um lançamento financeiro pelo Telegram.
        O Financial Bot interpreta as informações e registra
        os dados na planilha Google Sheets configurada pelo
        próprio usuário.
      </p>

      <p>
        O acesso ao Google Sheets acontece somente após
        autorização explícita através do Google OAuth.
      </p>
    `,
  );
}

export function privacyPage(): Response {
  return pageTemplate(
    "Política de Privacidade - Financial Bot",
    `
      <h1>Política de Privacidade</h1>

      <p>
        Esta Política de Privacidade descreve como o
        Financial Bot utiliza informações autorizadas
        pelo usuário.
      </p>

      <h2>Dados acessados</h2>

      <p>
        O aplicativo solicita acesso ao Google Sheets
        exclusivamente para ler e gravar informações
        nas planilhas autorizadas pelo usuário.
      </p>

      <p>
        Também são processadas as mensagens enviadas
        diretamente ao bot do Telegram para identificar
        os lançamentos financeiros solicitados pelo usuário.
      </p>

      <h2>Uso das informações</h2>

      <p>
        Os dados acessados são utilizados exclusivamente
        para executar as funcionalidades do Financial Bot,
        incluindo o registro e gerenciamento de lançamentos
        financeiros.
      </p>

      <h2>Compartilhamento</h2>

      <p>
        O Financial Bot não vende informações pessoais
        e não utiliza os dados acessados para publicidade.
      </p>

      <p>
        As informações somente são transmitidas aos serviços
        necessários para funcionamento da aplicação, como
        Google Sheets, Google OAuth, Telegram e a
        infraestrutura utilizada para executar o aplicativo.
      </p>

      <h2>Credenciais</h2>

      <p>
        Credenciais de autenticação utilizadas pela aplicação
        são armazenadas como segredos de ambiente e não são
        disponibilizadas publicamente.
      </p>

      <h2>Revogação do acesso</h2>

      <p>
        O usuário pode revogar a autorização concedida ao
        aplicativo através das configurações de segurança
        da própria Conta Google.
      </p>

      <h2>Alterações</h2>

      <p>
        Esta política poderá ser atualizada conforme novas
        funcionalidades forem adicionadas ao aplicativo.
      </p>
    `,
  );
}

export function termsPage(): Response {
  return pageTemplate(
    "Termos de Uso - Financial Bot",
    `
      <h1>Termos de Uso</h1>

      <p>
        O Financial Bot é uma ferramenta destinada à
        automação de registros financeiros pessoais.
      </p>

      <h2>Uso da aplicação</h2>

      <p>
        O usuário é responsável pelas informações enviadas
        ao aplicativo e pela conferência dos lançamentos
        registrados em sua planilha.
      </p>

      <h2>Acesso a serviços externos</h2>

      <p>
        Algumas funcionalidades dependem de serviços de
        terceiros, incluindo Google Sheets, Google OAuth
        e Telegram.
      </p>

      <h2>Disponibilidade</h2>

      <p>
        A aplicação pode sofrer interrupções ou alterações
        decorrentes de manutenção, mudanças técnicas ou
        indisponibilidade dos serviços externos utilizados.
      </p>

      <h2>Alterações</h2>

      <p>
        Estes termos poderão ser atualizados conforme
        o aplicativo evoluir.
      </p>
    `,
  );
}
