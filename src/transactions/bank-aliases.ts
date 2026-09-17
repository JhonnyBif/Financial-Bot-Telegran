export const BANK_ALIASES: Record<string, string> = {
  // PF - padrão
  nc: "Nubank Crédito PF",
  pix: "Nubank Pix PF",

  // PJ
  "nc pj": "Nubank Crédito PJ",
  "pix pj": "Nubank Pix PJ",

  // aliases antigos / atalhos
  np: "Nubank Pix PF",
  njc: "Nubank Crédito PJ",
  njp: "Nubank Pix PJ",

  // outros bancos
  ic: "Inter Crédito PF",
  ip: "Inter Pix PF",
};

export type ResolvedBankAlias = {
  bank: string;
  consumedParts: number;
};

export function resolveBankAlias(
  parts: string[],
): ResolvedBankAlias | null {
  if (parts.length === 0) {
    return null;
  }

  // Primeiro tenta alias de duas palavras.
  if (parts.length >= 2) {
    const twoParts = `${parts[0]} ${parts[1]}`.toLowerCase();

    const bank = BANK_ALIASES[twoParts];

    if (bank) {
      return {
        bank,
        consumedParts: 2,
      };
    }
  }

  const onePart = parts[0].toLowerCase();
  const bank = BANK_ALIASES[onePart];

  if (!bank) {
    return null;
  }

  return {
    bank,
    consumedParts: 1,
  };
}
