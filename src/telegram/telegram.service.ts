import type { Env } from "../env";
import { TelegramApiError } from "../shared/errors";
import type {
  TelegramSendMessageResponse,
} from "./telegram.types";

type SendMessageOptions = {
  chatId: number;
  text: string;
};

export class TelegramService {
  constructor(private readonly env: Env) {}

  async sendMessage(
    options: SendMessageOptions,
  ): Promise<void> {
    const response = await fetch(
      this.createApiUrl("sendMessage"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          chat_id: options.chatId,
          text: options.text,
        }),
      },
    );

    const result =
      await response.json<TelegramSendMessageResponse>();

    if (!response.ok || !result.ok) {
      throw new TelegramApiError(
        result.description ??
          "Não foi possível enviar a mensagem pelo Telegram.",
        response.status,
      );
    }
  }

  private createApiUrl(method: string): string {
    return `https://api.telegram.org/bot${this.env.TELEGRAM_BOT_TOKEN}/${method}`;
  }
}
