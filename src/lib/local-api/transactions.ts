import { calculateDailyTotals, calculateTotalPhp } from "@/lib/calculations";
import { db } from "@/lib/db";
import { normalizeText } from "@/lib/utils";
import { validateTransactionInput } from "@/lib/validation";
import type { Transaction, TransactionInput, TransactionType } from "@/types/transaction";

function cleanInput(input: TransactionInput): TransactionInput {
  const currencyAmount = Number(input.currencyAmount);
  const rate = Number(input.rate);

  return {
    date: input.date,
    customerName: input.customerName.trim(),
    orNumber: input.orNumber.trim(),
    currency: input.currency.trim().toUpperCase(),
    transactionType: input.transactionType,
    currencyAmount,
    rate,
    totalPhp: calculateTotalPhp(currencyAmount, rate)
  };
}

function assertValid(input: TransactionInput) {
  const validation = validateTransactionInput(input);
  if (Object.keys(validation.errors).length > 0) {
    throw new Error(Object.values(validation.errors)[0] ?? "Invalid transaction.");
  }
}

type LegacyTransaction = Partial<Transaction> & {
  buyingRate?: number;
  sellingRate?: number;
  income?: number;
};

function normalizeTransaction(record: LegacyTransaction): Transaction {
  const transactionType: TransactionType =
    record.transactionType === "SELL" || record.transactionType === "BUY" ? record.transactionType : "BUY";
  const legacyRate = transactionType === "SELL" ? record.sellingRate : record.buyingRate;
  const rate = Number(record.rate ?? legacyRate ?? record.buyingRate ?? record.sellingRate ?? 0);
  const existingTotalPhp = Number(record.totalPhp ?? 0);
  const derivedCurrencyAmount = rate > 0 && existingTotalPhp > 0 ? existingTotalPhp / rate : 0;
  const currencyAmount = Number(record.currencyAmount ?? derivedCurrencyAmount);
  const totalPhp = calculateTotalPhp(currencyAmount, rate) || existingTotalPhp;
  const now = new Date().toISOString();

  return {
    id: record.id || crypto.randomUUID(),
    date: record.date || now.slice(0, 10),
    customerName: (record.customerName || "Migrated record - edit details").trim(),
    orNumber: (record.orNumber || "MIGRATED").trim(),
    currency: (record.currency || "USD").trim().toUpperCase(),
    transactionType,
    currencyAmount,
    rate,
    totalPhp,
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now
  };
}

export const transactionRouter = {
  async create(input: TransactionInput) {
    const cleaned = cleanInput(input);
    assertValid(cleaned);
    const now = new Date().toISOString();
    const record: Transaction = {
      ...cleaned,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    await db.transactions.add(record);
    return record;
  },

  async update(id: string, input: TransactionInput) {
    const cleaned = cleanInput(input);
    assertValid(cleaned);
    const existing = await db.transactions.get(id);
    if (!existing) throw new Error("Record not found.");

    const updated: Transaction = {
      ...existing,
      ...cleaned,
      updatedAt: new Date().toISOString()
    };

    await db.transactions.put(updated);
    return updated;
  },

  async delete(id: string) {
    await db.transactions.delete(id);
    return { id };
  },

  async listByDate(date: string) {
    const records = await db.transactions.where("date").equals(date).toArray();
    return records.map(normalizeTransaction).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async search(query: string) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      const records = await db.transactions.orderBy("createdAt").reverse().toArray();
      return records.map(normalizeTransaction);
    }

    const records = await db.transactions.toArray();
    return records
      .map(normalizeTransaction)
      .filter(
        (record) =>
          normalizeText(record.customerName).includes(normalizedQuery) ||
          normalizeText(record.orNumber).includes(normalizedQuery)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getDailyTotals(date: string) {
    const records = await this.listByDate(date);
    return calculateDailyTotals(date, records);
  },

  async exportAll() {
    const records = await db.transactions.orderBy("createdAt").toArray();
    return records.map(normalizeTransaction);
  },

  async restoreAll(records: LegacyTransaction[]) {
    const cleanedRecords = records.map(normalizeTransaction);

    await db.transaction("rw", db.transactions, async () => {
      await db.transactions.clear();
      await db.transactions.bulkPut(cleanedRecords);
    });

    return cleanedRecords.length;
  },

  async clearAll() {
    await db.transactions.clear();
    return true;
  }
};
