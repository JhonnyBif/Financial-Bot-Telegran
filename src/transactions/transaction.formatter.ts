import { formatDatePtBr } from "../shared/date";
import { formatMoneyPtBr } from "../shared/money";
import type { SheetWriteResult } from "../sheets/sheets.types";
import type { Transaction } from "./transaction.types";

export function formatTransactionSavedMessage(
  transaction: Transaction,
  result: SheetWriteResult,
): string {
  if (transaction.type === "income") {
    return [
      "✅ Recebimento lançado",
      "",
      `Descrição: ${transaction.description}`,
      `Valor: ${formatMoneyPtBr(transaction.amount)}`,
      `Data: ${formatDatePtBr(transaction.date)}`,
      "",
      `Aba: ${result.sheetName}`,
    ].join("\n");
  }

  return [
    "✅ Despesa lançada",
    "",
    `Banco: ${transaction.source}`,
    `Descrição: ${transaction.description}`,
    `Valor: ${formatMoneyPtBr(transaction.amount)}`,
    `Data: ${formatDatePtBr(transaction.date)}`,
    "",
    `Aba: ${result.sheetName}`,
  ].join("\n");
}
