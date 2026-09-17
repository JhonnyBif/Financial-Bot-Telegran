export function parseMoney(rawValue: string): number {
  const normalizedValue = rawValue
    .replace(/^R\$\s*/i, "")
    .trim();

  if (!normalizedValue) {
    throw new Error("Valor não informado.");
  }

  const normalizedNumber = normalizeDecimalSeparators(normalizedValue);
  const amount = Number(normalizedNumber);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Valor inválido: '${rawValue}'.`);
  }

  return amount;
}

export function formatMoneyPtBr(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function normalizeDecimalSeparators(value: string): string {
  const hasComma = value.includes(",");
  const hasDot = value.includes(".");

  if (hasComma && hasDot) {
    return value
      .replace(/\./g, "")
      .replace(",", ".");
  }

  if (hasComma) {
    return value.replace(",", ".");
  }

  return value;
}
