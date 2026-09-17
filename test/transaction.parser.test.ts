import { describe, expect, it } from "vitest";
import { formatDatePtBr } from "../src/shared/date";
import { parseTransaction } from "../src/transactions/transaction.parser";

const FIXED_NOW = new Date("2026-07-16T15:00:00.000Z");

describe("transaction parser", () => {
  describe("expenses", () => {
    it("parses an expense using today's date", () => {
      const result = parseTransaction(
        "15 nc youtube premium",
        FIXED_NOW,
      );

      expect(result).toMatchObject({
        type: "expense",
        amount: 15,
        source: "Nubank Crédito PF",
        description: "youtube premium",
      });

      expect(formatDatePtBr(result.date)).toBe(
        "16/07/2026",
      );
    });

    it("parses a comma decimal amount", () => {
      const result = parseTransaction(
        "15,90 np mercado livre",
        FIXED_NOW,
      );

      expect(result.amount).toBe(15.9);
      expect(result.source).toBe("Nubank Pix PF");
    });

    it("parses a BRL amount", () => {
      const result = parseTransaction(
        "R$15,90 nc netflix",
        FIXED_NOW,
      );

      expect(result.amount).toBe(15.9);
    });

    it("parses a date without year", () => {
      const result = parseTransaction(
        "29,90 nc netflix 10/06",
        FIXED_NOW,
      );

      expect(formatDatePtBr(result.date)).toBe(
        "10/06/2026",
      );

      expect(result.description).toBe("netflix");
    });

    it("parses a complete date", () => {
      const result = parseTransaction(
        "29,90 nc netflix 10/06/2025",
        FIXED_NOW,
      );

      expect(formatDatePtBr(result.date)).toBe(
        "10/06/2025",
      );
    });
  });

  describe("incomes", () => {
    it("parses recebido command", () => {
      const result = parseTransaction(
        "recebido 4500 salário",
        FIXED_NOW,
      );

      expect(result).toMatchObject({
        type: "income",
        amount: 4500,
        source: null,
        description: "salário",
      });
    });

    it("parses r alias", () => {
      const result = parseTransaction(
        "r 500 freela 12/07",
        FIXED_NOW,
      );

      expect(result.type).toBe("income");
      expect(result.amount).toBe(500);
      expect(result.description).toBe("freela");

      expect(formatDatePtBr(result.date)).toBe(
        "12/07/2026",
      );
    });
  });

  describe("validation", () => {
    it("rejects an unknown bank", () => {
      expect(() =>
        parseTransaction(
          "15 xx teste",
          FIXED_NOW,
        ),
      ).toThrow("Banco 'xx' não reconhecido.");
    });

    it("rejects an invalid date", () => {
      expect(() =>
        parseTransaction(
          "15 nc netflix 31/02/2026",
          FIXED_NOW,
        ),
      ).toThrow("Data inválida.");
    });

    it("rejects a missing description", () => {
      expect(() =>
        parseTransaction(
          "15 nc",
          FIXED_NOW,
        ),
      ).toThrow("Descrição não informada.");
    });

    it("rejects an invalid amount", () => {
      expect(() =>
        parseTransaction(
          "abc nc netflix",
          FIXED_NOW,
        ),
      ).toThrow("Valor inválido");
    });

		it("parses Nubank crédito PF as default nc", () => {
			const result = parseTransaction(
				"15 nc youtube premium",
				FIXED_NOW,
			);

			expect(result.source).toBe("Nubank Crédito PF");
			expect(result.description).toBe("youtube premium");
		});

		it("parses Nubank pix PF", () => {
			const result = parseTransaction(
				"29,90 pix mercado",
				FIXED_NOW,
			);

			expect(result.source).toBe("Nubank Pix PF");
			expect(result.description).toBe("mercado");
		});

		it("parses Nubank crédito PJ", () => {
			const result = parseTransaction(
				"86,05 nc pj das mei",
				FIXED_NOW,
			);

			expect(result.source).toBe("Nubank Crédito PJ");
			expect(result.description).toBe("das mei");
		});

		it("parses Nubank pix PJ", () => {
			const result = parseTransaction(
				"120 pix pj contabilidade",
				FIXED_NOW,
			);

			expect(result.source).toBe("Nubank Pix PJ");
			expect(result.description).toBe("contabilidade");
		});
  });
});
