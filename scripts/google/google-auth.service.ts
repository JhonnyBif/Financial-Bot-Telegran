import type { Env } from "../../src/env";

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export class GoogleAuthService {
  constructor(private readonly env: Env) {}

  async getAccessToken(): Promise<string> {
    const response = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.env.GOOGLE_CLIENT_ID,
          client_secret: this.env.GOOGLE_CLIENT_SECRET,
          refresh_token: this.env.GOOGLE_REFRESH_TOKEN,
          grant_type: "refresh_token",
        }),
      },
    );

    const data = await response.json<GoogleTokenResponse>();

    if (!response.ok || !data.access_token) {
      throw new Error(
        data.error_description ??
          data.error ??
          "Falha ao obter access token do Google.",
      );
    }

    return data.access_token;
  }
}
