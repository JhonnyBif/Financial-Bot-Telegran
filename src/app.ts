import type { Env } from "./env";
import { TelegramWebhookController } from "./telegram/webhook.controller";
import { homePage, privacyPage, termsPage } from "./public/public-pages";

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const url = new URL(request.url);

		if (
      request.method === "GET" &&
      url.pathname === "/"
    ) {
      return homePage();
    }

    if (
      request.method === "GET" &&
      url.pathname === "/privacy"
    ) {
      return privacyPage();
    }

    if (
      request.method === "GET" &&
      url.pathname === "/terms"
    ) {
      return termsPage();
    }

    if (
      request.method === "GET" &&
      url.pathname === "/health"
    ) {
      return Response.json({
        ok: true,
        service: "finance-telegram-bot",
      });
    }

    if (
      request.method === "POST" &&
      url.pathname === "/telegram/webhook"
    ) {
      const controller =
        new TelegramWebhookController(env);

      return controller.handle(request);
    }

    return new Response("Not Found", {
      status: 404,
    });
  },
};
