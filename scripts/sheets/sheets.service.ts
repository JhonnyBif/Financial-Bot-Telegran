import type { Env } from "../../src/env";
import { GoogleAuthService } from "../google/google-auth.service";

type SheetsValuesResponse = {
  range?: string;
  majorDimension?: string;
  values?: string[][];
};

export class SheetsService {
  private readonly authService: GoogleAuthService;

  constructor(private readonly env: Env) {
    this.authService = new GoogleAuthService(env);
  }

  async readRange(range: string): Promise<string[][]> {
    const accessToken =
      await this.authService.getAccessToken();

    const encodedRange = encodeURIComponent(range);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.env.GOOGLE_SHEET_ID}/values/${encodedRange}`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const data =
      await response.json<SheetsValuesResponse>();

    if (!response.ok) {
      throw new Error(
        `Erro ao ler a planilha: ${JSON.stringify(data)}`,
      );
    }

    return data.values ?? [];
  }
}
