import { db } from "@/lib/db";
import { normalizeText } from "@/lib/utils";
import type { TransactionInput } from "@/types/transaction";

export type ValidationResult = {
  errors: Partial<Record<keyof TransactionInput, string>>;
  warnings: string[];
};

export function validateTransactionInput(input: TransactionInput): ValidationResult {
  const errors: ValidationResult["errors"] = {};
  const warnings: string[] = [];

  if (!input.date) errors.date = "Date is required.";
  if (!input.customerName.trim()) errors.customerName = "Customer name is required.";
  if (!input.orNumber.trim()) errors.orNumber = "OR number is required.";
  if (!input.currency.trim()) errors.currency = "Currency is required.";
  if (input.transactionType !== "BUY" && input.transactionType !== "SELL") {
    errors.transactionType = "Transaction type must be BUY or SELL.";
  }
  if (!(input.currencyAmount > 0)) errors.currencyAmount = "Currency amount must be greater than 0.";
  if (!(input.rate > 0)) errors.rate = "Rate must be greater than 0.";
  if (!(input.totalPhp > 0)) errors.totalPhp = "Total PHP must be greater than 0.";

  return { errors, warnings };
}

export async function findDuplicateWarnings(input: TransactionInput, excludeId?: string) {
  const warnings: string[] = [];
  const records = await db.transactions.toArray();
  const normalizedOr = normalizeText(input.orNumber);
  const normalizedCustomer = normalizeText(input.customerName);

  const sameOr = records.find(
    (record) => record.id !== excludeId && normalizeText(record.orNumber) === normalizedOr
  );

  if (sameOr) {
    warnings.push("OR number already exists.");
  }

  const sameCustomerOrDate = records.find(
    (record) =>
      record.id !== excludeId &&
      record.date === input.date &&
      normalizeText(record.customerName) === normalizedCustomer &&
      normalizeText(record.orNumber) === normalizedOr
  );

  if (sameCustomerOrDate) {
    warnings.push("Same customer, OR number, and date already exists.");
  }

  return warnings;
}
