import { extractDateFromMessage } from "../shared/date";
import { parseMoney } from "../shared/money";
import { resolveBankAlias } from "./bank-aliases";
import type { Transaction } from "./transaction.types";

const INCOME_COMMANDS = new Set([
  "recebido",
  "r",
]);

export function parseTransaction(
  rawMessage: string,
  now: Date = new Date(),
): Transaction {
  const normalizedMessage = rawMessage.trim();

  if (!normalizedMessage) {
    throw new Error("Mensagem vazia.");
  }

  const {
    date,
    messageWithoutDate,
  } = extractDateFromMessage(normalizedMessage, now);

  const parts = messageWithoutDate.split(/\s+/);
  const firstPart = parts[0]?.toLowerCase();

  if (firstPart && INCOME_COMMANDS.has(firstPart)) {
    return parseIncome(parts, date);
  }

  return parseExpense(parts, date);
}

function parseExpense(
  parts: string[],
  date: Date,
): Transaction {
  const amountRaw = parts.shift();

  if (!amountRaw) {
    throw new Error("Valor da despesa não informado.");
  }

  const amount = parseMoney(amountRaw);

  const resolvedBank = resolveBankAlias(parts);

  if (!resolvedBank) {
    const informedAlias = parts
      .slice(0, Math.min(parts.length, 2))
      .join(" ");

    throw new Error(
      informedAlias
        ? `Banco '${informedAlias}' não reconhecido.`
        : "Banco não informado.",
    );
  }

  parts.splice(0, resolvedBank.consumedParts);

  const description = normalizeDescription(parts);

  return {
    type: "expense",
    amount,
    source: resolvedBank.bank,
    description,
    date,
  };
}

function parseIncome(
  parts: string[],
  date: Date,
): Transaction {
  parts.shift();

  const amountRaw = parts.shift();

  if (!amountRaw) {
    throw new Error(
      "Valor do recebimento não informado.",
    );
  }

  const amount = parseMoney(amountRaw);
  const description = normalizeDescription(parts);

  return {
    type: "income",
    amount,
    source: null,
    description,
    date,
  };
}

function normalizeDescription(parts: string[]): string {
  const description = parts.join(" ").trim();

  if (!description) {
    throw new Error("Descrição não informada.");
  }

  return description;
}
