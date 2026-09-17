const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

export type ParsedMessageDate = {
  date: Date;
  messageWithoutDate: string;
};

export function extractDateFromMessage(
  message: string,
  now: Date = new Date(),
): ParsedMessageDate {
  const normalizedMessage = message.trim();

  const dateMatch = normalizedMessage.match(
    /(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/,
  );

  if (!dateMatch) {
    return {
      date: getCurrentBrazilDate(now),
      messageWithoutDate: normalizedMessage,
    };
  }

  const fullDateExpression = dateMatch[0].trim();
  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const currentBrazilYear = getBrazilDateParts(now).year;
  const year = dateMatch[3] ? Number(dateMatch[3]) : currentBrazilYear;

  const date = createValidatedDate(year, month, day);

  return {
    date,
    messageWithoutDate: normalizedMessage
      .slice(0, normalizedMessage.length - fullDateExpression.length)
      .trim(),
  };
}

export function formatDatePtBr(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

function getCurrentBrazilDate(now: Date): Date {
  const { year, month, day } = getBrazilDateParts(now);

  return createValidatedDate(year, month, day);
}

function getBrazilDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);

  const year = Number(
    parts.find((part) => part.type === "year")?.value,
  );

  const month = Number(
    parts.find((part) => part.type === "month")?.value,
  );

  const day = Number(
    parts.find((part) => part.type === "day")?.value,
  );

  if (!year || !month || !day) {
    throw new Error("Não foi possível determinar a data atual.");
  }

  return {
    year,
    month,
    day,
  };
}

function createValidatedDate(
  year: number,
  month: number,
  day: number,
): Date {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Ano inválido.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Mês inválido.");
  }

  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error("Dia inválido.");
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isValid) {
    throw new Error("Data inválida.");
  }

  return date;
}
