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
  const byCurrencyMap = new Map<string, Transaction[]>();

  records.forEach((record) => {
    const currency = record.currency.toUpperCase();
    byCurrencyMap.set(currency, [...(byCurrencyMap.get(currency) ?? []), record]);
  });

  return Array.from(byCurrencyMap.entries())
    .map(([currency, currencyRecords]) => {
      const buyRecords = currencyRecords.filter((record) => record.transactionType === "BUY");
      const sellRecords = currencyRecords.filter((record) => record.transactionType === "SELL");
      const totalBoughtAmount = buyRecords.reduce((sum, record) => sum + record.currencyAmount, 0);
      const totalBuyPhp = buyRecords.reduce((sum, record) => sum + record.totalPhp, 0);
      const totalSoldAmount = sellRecords.reduce((sum, record) => sum + record.currencyAmount, 0);
      const totalSellPhp = sellRecords.reduce((sum, record) => sum + record.totalPhp, 0);
      const hasBuyAndSell = totalBoughtAmount > 0 && totalSoldAmount > 0;
      const averageBuyRate = totalBoughtAmount > 0 ? totalBuyPhp / totalBoughtAmount : null;
      const averageSellRate = totalSoldAmount > 0 ? totalSellPhp / totalSoldAmount : null;
      const matchedSoldAmount = hasBuyAndSell ? Math.min(totalSoldAmount, totalBoughtAmount) : 0;
      const matchedBuyCostPhp =
        hasBuyAndSell && averageBuyRate !== null ? roundMoney(matchedSoldAmount * averageBuyRate) : null;
      const matchedSellRevenuePhp =
        hasBuyAndSell && averageSellRate !== null ? roundMoney(matchedSoldAmount * averageSellRate) : null;
      const estimatedIncomePhp =
        matchedBuyCostPhp !== null && matchedSellRevenuePhp !== null
          ? roundMoney(matchedSellRevenuePhp - matchedBuyCostPhp)
          : totalBoughtAmount > 0 && totalSoldAmount === 0
            ? 0
            : null;

      return {
        currency,
        totalBoughtAmount,
        totalBuyPhp,
        totalSoldAmount,
        totalSellPhp,
        averageBuyRate,
        averageSellRate,
        matchedSoldAmount,
        matchedBuyCostPhp,
        matchedSellRevenuePhp,
        estimatedIncomePhp,
        unmatchedBuyAmount: Math.max(totalBoughtAmount - totalSoldAmount, 0),
        unmatchedSellAmount: Math.max(totalSoldAmount - totalBoughtAmount, 0)
      };
    })
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}
