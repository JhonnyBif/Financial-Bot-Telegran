import { GoogleAuthService } from "../../scripts/google/google-auth.service";
import type { Env } from "../env";
import { formatDatePtBr } from "../shared/date";
import type { Transaction } from "../transactions/transaction.types";
import { SheetWriteResult } from "./sheets.types";

type SheetsValuesResponse = {
  range?: string;
  majorDimension?: string;
  values?: unknown[][];
};

type SpreadsheetMetadataResponse = {
  sheets?: Array<{
    properties?: {
      title?: string;
    };
  }>;
};

const FIRST_DATA_ROW = 9;
const MAX_DATA_ROW = 2000;

export class SheetsService {
  private readonly authService: GoogleAuthService;

  constructor(private readonly env: Env) {
    this.authService = new GoogleAuthService(env);
  }

  async appendTransaction(
    transaction: Transaction,
  ): Promise<SheetWriteResult> {
    const sheetName = this.resolveSheetName(transaction.date);

    await this.ensureSheetExists(sheetName);

    if (transaction.type === "income") {
      return this.appendIncome(sheetName, transaction);
    }

    return this.appendExpense(sheetName, transaction);
  }

	private isEmptyCell(value: unknown): boolean {
		return (
			value === undefined ||
			value === null ||
			String(value).trim() === ""
		);
	}

	private async findFirstEmptyExpenseRow(
		sheetName: string,
	): Promise<number> {
		const range =
			`${this.quoteSheetName(sheetName)}!` +
			`B${FIRST_DATA_ROW}:D${MAX_DATA_ROW}`;

		const values = await this.readRange(range);

		for (
			let index = 0;
			index < MAX_DATA_ROW - FIRST_DATA_ROW + 1;
			index++
		) {
			const row = values[index] ?? [];

			const description = row[0];
			const amount = row[1];
			const date = row[2];

			const isEmpty =
				this.isEmptyCell(description) &&
				this.isEmptyCell(amount) &&
				this.isEmptyCell(date);

			if (isEmpty) {
				return FIRST_DATA_ROW + index;
			}
		}

		throw new Error(
			`Não há linhas livres para despesas na aba '${sheetName}'.`,
		);
	}

  private async appendExpense(
		sheetName: string,
		transaction: Transaction,
	): Promise<SheetWriteResult> {
		const row = await this.findFirstEmptyExpenseRow(
			sheetName,
		);

		const range =
			`${this.quoteSheetName(sheetName)}!A${row}:D${row}`;

		await this.writeRange(range, [
			[
				transaction.source,
				transaction.description,
				transaction.amount,
				formatDatePtBr(transaction.date),
			],
		]);

		return {
			sheetName,
			row,
			range,
		};
	}

  private async appendIncome(
    sheetName: string,
    transaction: Transaction,
  ): Promise<SheetWriteResult> {
    const row = await this.findFirstEmptyRow(
      sheetName,
      "F",
    );

    const range = `${this.quoteSheetName(sheetName)}!F${row}:H${row}`;

    await this.writeRange(range, [
      [
        transaction.description,
        transaction.amount,
        formatDatePtBr(transaction.date),
      ],
    ]);

    return {
      sheetName,
      row,
      range,
    };
  }

  private async findFirstEmptyRow(
    sheetName: string,
    column: string,
  ): Promise<number> {
    const range =
      `${this.quoteSheetName(sheetName)}!` +
      `${column}${FIRST_DATA_ROW}:${column}${MAX_DATA_ROW}`;

    const values = await this.readRange(range);

    for (let index = 0; index < values.length; index++) {
      const value = values[index]?.[0];

      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
      ) {
        return FIRST_DATA_ROW + index;
      }
    }

    // A API costuma omitir as linhas vazias finais.
    // Então, se vierem 10 linhas preenchidas, a próxima é 9 + 10.
    const nextRow = FIRST_DATA_ROW + values.length;

    if (nextRow > MAX_DATA_ROW) {
      throw new Error(
        `Não há linhas livres disponíveis na aba '${sheetName}'.`,
      );
    }

    return nextRow;
  }

  private async readRange(
    range: string,
  ): Promise<unknown[][]> {
    const accessToken =
      await this.authService.getAccessToken();

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/` +
        `${this.env.GOOGLE_SHEET_ID}/values/` +
        `${encodeURIComponent(range)}`,
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

  private async writeRange(
    range: string,
    values: unknown[][],
  ): Promise<void> {
    const accessToken =
      await this.authService.getAccessToken();

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/` +
        `${this.env.GOOGLE_SHEET_ID}/values/` +
        `${encodeURIComponent(range)}` +
        `?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          range,
          majorDimension: "ROWS",
          values,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();

      throw new Error(
        `Erro ao gravar na planilha: ${error}`,
      );
    }
  }

  private async ensureSheetExists(
		sheetName: string,
	): Promise<void> {
		const accessToken =
			await this.authService.getAccessToken();

		const response = await fetch(
			`https://sheets.googleapis.com/v4/spreadsheets/` +
				`${this.env.GOOGLE_SHEET_ID}` +
				`?fields=sheets.properties.title`,
			{
				headers: {
					authorization: `Bearer ${accessToken}`,
				},
			},
		);

		const rawBody = await response.text();

		if (!response.ok) {
			throw new Error(
				[
					`Não foi possível consultar as abas da planilha.`,
					`HTTP ${response.status}`,
					rawBody,
				].join(" "),
			);
		}

		const data = JSON.parse(
			rawBody,
		) as SpreadsheetMetadataResponse;

		const titles =
			data.sheets
				?.map((sheet) => sheet.properties?.title)
				.filter(
					(title): title is string =>
						typeof title === "string",
				) ?? [];

		if (!titles.includes(sheetName)) {
			throw new Error(
				`A aba '${sheetName}' não existe. Abas encontradas: ${titles.join(", ")}`,
			);
		}
	}

  private resolveSheetName(date: Date): string {
    const month = String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0");

    const year = String(
      date.getUTCFullYear(),
    ).slice(-2);

    return `Mês ${month}.${year}`;
  }

  private quoteSheetName(sheetName: string): string {
    const escaped = sheetName.replace(/'/g, "''");

    return `'${escaped}'`;
  }
}
