import type { CurrencyIncomeReport, DailyTotals, Transaction } from "@/types/transaction";

export function calculateTotalPhp(currencyAmount: number, rate: number) {
  const total = currencyAmount * rate;
  return Number.isFinite(total) ? Number(total.toFixed(2)) : 0;
}

export function calculateDailyTotals(date: string, records: Transaction[]): DailyTotals {
  const byCurrencyMap = new Map<
    string,
    {
      buyCount: number;
      sellCount: number;
      boughtAmount: number;
      soldAmount: number;
      buyTotalPhp: number;
      sellTotalPhp: number;
    }
  >();

  for (const record of records) {
    const currency = record.currency.toUpperCase();
    const current = byCurrencyMap.get(currency) ?? {
      buyCount: 0,
      sellCount: 0,
      boughtAmount: 0,
      soldAmount: 0,
      buyTotalPhp: 0,
      sellTotalPhp: 0
    };

    byCurrencyMap.set(currency, {
      buyCount: current.buyCount + (record.transactionType === "BUY" ? 1 : 0),
      sellCount: current.sellCount + (record.transactionType === "SELL" ? 1 : 0),
      boughtAmount: current.boughtAmount + (record.transactionType === "BUY" ? record.currencyAmount : 0),
      soldAmount: current.soldAmount + (record.transactionType === "SELL" ? record.currencyAmount : 0),
      buyTotalPhp: current.buyTotalPhp + (record.transactionType === "BUY" ? record.totalPhp : 0),
      sellTotalPhp: current.sellTotalPhp + (record.transactionType === "SELL" ? record.totalPhp : 0)
    });
  }

  return {
    date,
    totalRecords: records.length,
    totalBuyRecords: records.filter((record) => record.transactionType === "BUY").length,
    totalSellRecords: records.filter((record) => record.transactionType === "SELL").length,
    totalBuyPhp: records
      .filter((record) => record.transactionType === "BUY")
      .reduce((sum, record) => sum + record.totalPhp, 0),
    totalSellPhp: records
      .filter((record) => record.transactionType === "SELL")
      .reduce((sum, record) => sum + record.totalPhp, 0),
    byCurrency: Array.from(byCurrencyMap.entries())
      .map(([currency, totals]) => ({ currency, ...totals }))
      .sort((a, b) => a.currency.localeCompare(b.currency))
  };
}

export function calculateIncomeReports(records: Transaction[]): CurrencyIncomeReport[] {
  const byCurrencyMap = new Map<
    string,
    {
      totalBoughtAmount: number;
      totalBuyPhp: number;
      totalSoldAmount: number;
      totalSellPhp: number;
    }
  >();

  for (const record of records) {
    const currency = record.currency.toUpperCase();
    const current = byCurrencyMap.get(currency) ?? {
      totalBoughtAmount: 0,
      totalBuyPhp: 0,
      totalSoldAmount: 0,
      totalSellPhp: 0
    };

    if (record.transactionType === "BUY") {
      current.totalBoughtAmount += record.currencyAmount;
      current.totalBuyPhp += record.totalPhp;
    } else {
      current.totalSoldAmount += record.currencyAmount;
      current.totalSellPhp += record.totalPhp;
    }

    byCurrencyMap.set(currency, current);
  }

  return Array.from(byCurrencyMap.entries())
    .map(([currency, totals]) => {
      const averageBuyRate =
        totals.totalBoughtAmount > 0 ? totals.totalBuyPhp / totals.totalBoughtAmount : null;
      const matchedSoldAmount = Math.min(totals.totalSoldAmount, totals.totalBoughtAmount);
      const averageSellRateForMatched =
        totals.totalSoldAmount > 0 ? totals.totalSellPhp / totals.totalSoldAmount : 0;
      const matchedBuyCostPhp = averageBuyRate !== null ? matchedSoldAmount * averageBuyRate : null;
      const matchedSellRevenuePhp =
        averageBuyRate !== null ? matchedSoldAmount * averageSellRateForMatched : null;
      const estimatedIncomePhp =
        matchedBuyCostPhp !== null && matchedSellRevenuePhp !== null
          ? matchedSellRevenuePhp - matchedBuyCostPhp
          : null;

      return {
        currency,
        ...totals,
        averageBuyRate,
        matchedSoldAmount,
        matchedBuyCostPhp,
        matchedSellRevenuePhp,
        estimatedIncomePhp,
        unmatchedBuyAmount: Math.max(totals.totalBoughtAmount - totals.totalSoldAmount, 0),
        unmatchedSellAmount: Math.max(totals.totalSoldAmount - totals.totalBoughtAmount, 0)
      };
    })
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
