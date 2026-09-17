import { parseTransaction } from "./transaction.parser";
import type { Transaction } from "./transaction.types";

export class TransactionService {
  parse(
    message: string,
    now?: Date,
  ): Transaction {
    return parseTransaction(message, now);
  }
}
