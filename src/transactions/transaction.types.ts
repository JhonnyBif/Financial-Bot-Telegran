export type TransactionType = "expense" | "income";

export type Transaction = {
  type: TransactionType;
  amount: number;
  description: string;
  source: string | null;
  date: Date;
};
