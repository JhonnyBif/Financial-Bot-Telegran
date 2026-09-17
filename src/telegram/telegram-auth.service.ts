import type { Env } from "../env";

export class TelegramAuthService {
  private readonly allowedUserIds: Set<number>;

  constructor(env: Env) {
    this.allowedUserIds = new Set(
      env.ALLOWED_TELEGRAM_USER_IDS
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => Number(value))
        .filter((value) => Number.isSafeInteger(value)),
    );
  }

  isAllowed(userId: number): boolean {
    return this.allowedUserIds.has(userId);
  }
}
