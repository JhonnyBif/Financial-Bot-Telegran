import "dotenv/config";
import dotenv from "dotenv";

dotenv.config({
  path: ".dev.vars",
});
import http from "node:http";
import { URL } from "node:url";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error(
    "Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no ambiente.",
  );
}

const REDIRECT_URI = "http://localhost:3000/oauth2callback";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
];

const authUrl = new URL(
  "https://accounts.google.com/o/oauth2/v2/auth",
);

authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPES.join(" "));
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

console.log("\nAbra esta URL no navegador:\n");
console.log(authUrl.toString());
console.log("\nAguardando callback...\n");

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    return;
  }

  const url = new URL(req.url, "http://localhost:3000");

  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400);
    res.end("Código OAuth não recebido.");
    return;
  }

  const tokenResponse = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    },
  );

  const tokenData = await tokenResponse.json();

  console.log("\nResposta do Google:\n");
  console.log(tokenData);

  res.writeHead(200, {
    "content-type": "text/plain; charset=utf-8",
  });

  res.end(
    "Autorização concluída. Pode voltar para o terminal.",
  );

  server.close();
});

server.listen(3000, () => {
  console.log("Servidor local em http://localhost:3000");
});
