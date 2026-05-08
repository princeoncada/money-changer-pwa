import Dexie, { type Table } from "dexie";
import type { Transaction } from "@/types/transaction";

class MoneyChangerDatabase extends Dexie {
  transactions!: Table<Transaction, string>;

  constructor() {
    super("moneyChangerRecords");
    this.version(1).stores({
      transactions: "id, date, customerName, orNumber, currency, createdAt, updatedAt"
    });
    this.version(2).stores({
      transactions: "id, date, customerName, orNumber, currency, transactionType, createdAt, updatedAt"
    });
  }
}

export const db = new MoneyChangerDatabase();
