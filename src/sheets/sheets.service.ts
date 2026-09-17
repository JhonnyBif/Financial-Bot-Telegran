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

		const sheetId = await this.ensureSheetExists(sheetName);

		if (transaction.type === "income") {
			return this.appendIncome(
				sheetName,
				sheetId,
				transaction,
			);
		}

		return this.appendExpense(
			sheetName,
			sheetId,
			transaction,
		);
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
		sheetId: number,
	): Promise<number> {
		const range =
			`${this.quoteSheetName(sheetName)}!` +
			`B${FIRST_DATA_ROW}:D${MAX_DATA_ROW}`;

		const values = await this.readRange(range);

		for (let index = 0; index < values.length; index++) {
			const rowNumber = FIRST_DATA_ROW + index;
			const row = values[index] ?? [];

			const description = row[0];
			const amount = row[1];
			const date = row[2];

			const label = String(description ?? "")
				.trim()
				.toLowerCase();

			if (label === "gasto") {
				const nextLabel = String(
					values[index + 1]?.[0] ?? "",
				)
					.trim()
					.toLowerCase();

				if (nextLabel !== "restante") {
					throw new Error(
						`A linha de 'Restante' não foi encontrada após 'Gasto' na aba '${sheetName}'.`,
					);
				}

				await this.moveExpenseSummaryDown(
					sheetId,
					rowNumber,
				);

				return rowNumber;
			}

			const isEmpty =
				this.isEmptyCell(description) &&
				this.isEmptyCell(amount) &&
				this.isEmptyCell(date);

			if (isEmpty) {
				return rowNumber;
			}
		}

		throw new Error(
			`Não foi possível encontrar espaço para uma nova despesa na aba '${sheetName}'.`,
		);
	}

  private async appendExpense(
		sheetName: string,
		sheetId: number,
		transaction: Transaction,
	): Promise<SheetWriteResult> {
		const row =
			await this.findFirstEmptyExpenseRow(
				sheetName,
				sheetId,
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

		await this.formatWrittenCells(
			sheetId,
			row,
			0,
			4,
		);

		return {
			sheetName,
			row,
			range,
		};
	}

  private async appendIncome(
		sheetName: string,
		sheetId: number,
		transaction: Transaction,
	): Promise<SheetWriteResult> {
		const row = await this.findFirstEmptyRow(
			sheetName,
			"F",
		);

		const range =
			`${this.quoteSheetName(sheetName)}!F${row}:H${row}`;

		await this.writeRange(range, [
			[
				transaction.description,
				transaction.amount,
				formatDatePtBr(transaction.date),
			],
		]);

		await this.formatWrittenCells(
			sheetId,
			row,
			5,
			8,
		);

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
	): Promise<number> {
		const accessToken =
			await this.authService.getAccessToken();

		const response = await fetch(
			`https://sheets.googleapis.com/v4/spreadsheets/` +
				`${this.env.GOOGLE_SHEET_ID}` +
				`?fields=sheets.properties(sheetId,title)`,
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
					"Não foi possível consultar as abas da planilha.",
					`HTTP ${response.status}`,
					rawBody,
				].join(" "),
			);
		}

		const data = JSON.parse(rawBody) as {
			sheets?: Array<{
				properties?: {
					sheetId?: number;
					title?: string;
				};
			}>;
		};

		const sheet = data.sheets?.find(
			(item) =>
				item.properties?.title === sheetName,
		);

		const sheetId = sheet?.properties?.sheetId;

		if (sheetId === undefined) {
			throw new Error(
				`A aba '${sheetName}' não existe na planilha.`,
			);
		}
		return sheetId;
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

	private async formatWrittenCells(
		sheetId: number,
		row: number,
		startColumnIndex: number,
		endColumnIndex: number,
	): Promise<void> {
		const accessToken =
			await this.authService.getAccessToken();

		const response = await fetch(
			`https://sheets.googleapis.com/v4/spreadsheets/` +
				`${this.env.GOOGLE_SHEET_ID}:batchUpdate`,
			{
				method: "POST",
				headers: {
					authorization: `Bearer ${accessToken}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					requests: [
						{
							repeatCell: {
								range: {
									sheetId,

									// API usa índice começando em zero
									startRowIndex: row - 1,
									endRowIndex: row,

									startColumnIndex,
									endColumnIndex,
								},

								cell: {
									userEnteredFormat: {
										textFormat: {
											fontFamily: "Calibri",
											fontSize: 11,
											foregroundColor: {
												red: 0,
												green: 0,
												blue: 0,
											},
										},

										wrapStrategy: "OVERFLOW_CELL",
									},
								},

								fields: [
									"userEnteredFormat.textFormat.fontFamily",
									"userEnteredFormat.textFormat.fontSize",
									"userEnteredFormat.textFormat.foregroundColor",
									"userEnteredFormat.wrapStrategy",
								].join(","),
							},
						},
					],
				}),
			},
		);

		if (!response.ok) {
			const error = await response.text();

			throw new Error(
				`Erro ao formatar células: ${error}`,
			);
		}
	}

	private async moveExpenseSummaryDown(
		sheetId: number,
		gastoRow: number,
	): Promise<void> {
		const restanteRow = gastoRow + 1;

		const newGastoRow = gastoRow + 1;
		const newRestanteRow = gastoRow + 2;

		const accessToken =
			await this.authService.getAccessToken();

		const response = await fetch(
			`https://sheets.googleapis.com/v4/spreadsheets/` +
				`${this.env.GOOGLE_SHEET_ID}:batchUpdate`,
			{
				method: "POST",
				headers: {
					authorization: `Bearer ${accessToken}`,
					"content-type": "application/json",
				},

				body: JSON.stringify({
					requests: [
						// Primeiro move Restante para baixo.
						{
							cutPaste: {
								source: {
									sheetId,

									startRowIndex: restanteRow - 1,
									endRowIndex: restanteRow,

									startColumnIndex: 1,
									endColumnIndex: 3,
								},

								destination: {
									sheetId,
									rowIndex: newRestanteRow - 1,
									columnIndex: 1,
								},

								pasteType: "PASTE_NORMAL",
							},
						},

						// Depois move Gasto para baixo.
						{
							cutPaste: {
								source: {
									sheetId,

									startRowIndex: gastoRow - 1,
									endRowIndex: gastoRow,

									startColumnIndex: 1,
									endColumnIndex: 3,
								},

								destination: {
									sheetId,
									rowIndex: newGastoRow - 1,
									columnIndex: 1,
								},

								pasteType: "PASTE_NORMAL",
							},
						},

						// A antiga linha de Gasto agora será uma despesa.
						// Copia apenas o formato da despesa anterior.
						{
							copyPaste: {
								source: {
									sheetId,

									startRowIndex: gastoRow - 2,
									endRowIndex: gastoRow - 1,

									startColumnIndex: 0,
									endColumnIndex: 4,
								},

								destination: {
									sheetId,

									startRowIndex: gastoRow - 1,
									endRowIndex: gastoRow,

									startColumnIndex: 0,
									endColumnIndex: 4,
								},

								pasteType: "PASTE_FORMAT",
								pasteOrientation: "NORMAL",
							},
						},

						// Atualiza Gasto e Restante com o novo limite.
						{
							updateCells: {
								start: {
									sheetId,
									rowIndex: newGastoRow - 1,
									columnIndex: 1,
								},

								rows: [
									{
										values: [
											{
												userEnteredValue: {
													stringValue: "Gasto",
												},
											},
											{
												userEnteredValue: {
													formulaValue:
														`=SUM(C${FIRST_DATA_ROW}:C${gastoRow})`,
												},
											},
										],
									},

									{
										values: [
											{
												userEnteredValue: {
													stringValue: "Restante",
												},
											},
											{
												userEnteredValue: {
													formulaValue:
														`=K5+K3-SUM(C${FIRST_DATA_ROW}:C${gastoRow})`,
												},
											},
										],
									},
								],

								fields: "userEnteredValue",
							},
						},
					],
				}),
			},
		);

		if (!response.ok) {
			const error = await response.text();

			throw new Error(
				`Erro ao mover resumo de gastos: ${error}`,
			);
		}
	}
}
