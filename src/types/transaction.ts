export type TransactionType = "BUY" | "SELL";

export type Transaction = {
  id: string;
  date: string;
  customerName: string;
  orNumber: string;
  currency: string;
  transactionType: TransactionType;
  currencyAmount: number;
  rate: number;
  totalPhp: number;
  createdAt: string;
  updatedAt: string;
};

export type TransactionInput = Omit<Transaction, "id" | "createdAt" | "updatedAt">;

export type CurrencyTotal = {
  currency: string;
  buyCount: number;
  sellCount: number;
  boughtAmount: number;
  soldAmount: number;
  buyTotalPhp: number;
  sellTotalPhp: number;
};

export type DailyTotals = {
  date: string;
  totalRecords: number;
  totalBuyRecords: number;
  totalSellRecords: number;
  totalBuyPhp: number;
  totalSellPhp: number;
  byCurrency: CurrencyTotal[];
};

export type CurrencyIncomeReport = {
  currency: string;
  totalBoughtAmount: number;
  totalBuyPhp: number;
  totalSoldAmount: number;
  totalSellPhp: number;
  averageBuyRate: number | null;
  averageSellRate: number | null;
  matchedSoldAmount: number;
  matchedBuyCostPhp: number | null;
  matchedSellRevenuePhp: number | null;
  estimatedIncomePhp: number | null;
  unmatchedBuyAmount: number;
  unmatchedSellAmount: number;
};
