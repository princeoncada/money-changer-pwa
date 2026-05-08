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
  type CurrencyRecord = Transaction & { inputOrder: number };
  type Lot = { remainingAmount: number; rate: number };
  const byCurrencyMap = new Map<string, CurrencyRecord[]>();

  records.forEach((record, inputOrder) => {
    const currency = record.currency.toUpperCase();
    byCurrencyMap.set(currency, [...(byCurrencyMap.get(currency) ?? []), { ...record, inputOrder }]);
  });

  return Array.from(byCurrencyMap.entries())
    .map(([currency, currencyRecords]) => {
      const sortedRecords = [...currencyRecords].sort((a, b) => {
        const dateOrder = a.date.localeCompare(b.date);
        if (dateOrder !== 0) return dateOrder;
        if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
          return a.createdAt.localeCompare(b.createdAt);
        }
        return a.inputOrder - b.inputOrder;
      });

      const buyLots: Lot[] = [];
      const sellLots: Lot[] = [];
      let totalBoughtAmount = 0;
      let totalBuyPhp = 0;
      let totalSoldAmount = 0;
      let totalSellPhp = 0;
      let matchedSoldAmount = 0;
      let matchedBuyCostPhp = 0;
      let matchedSellRevenuePhp = 0;
      let estimatedIncomePhp = 0;

      function matchLots(incoming: Lot, queue: Lot[], incomeMultiplier: 1 | -1) {
        while (incoming.remainingAmount > 0 && queue.length > 0) {
          const lot = queue[0];
          const matchedAmount = Math.min(incoming.remainingAmount, lot.remainingAmount);
          const buyRate = incomeMultiplier === 1 ? lot.rate : incoming.rate;
          const sellRate = incomeMultiplier === 1 ? incoming.rate : lot.rate;

          matchedSoldAmount += matchedAmount;
          matchedBuyCostPhp += buyRate * matchedAmount;
          matchedSellRevenuePhp += sellRate * matchedAmount;
          estimatedIncomePhp += (sellRate - buyRate) * matchedAmount;

          incoming.remainingAmount -= matchedAmount;
          lot.remainingAmount -= matchedAmount;

          if (lot.remainingAmount <= 0) queue.shift();
        }
      }

      for (const record of sortedRecords) {
        const lot = { remainingAmount: record.currencyAmount, rate: record.rate };

        if (record.transactionType === "BUY") {
          totalBoughtAmount += record.currencyAmount;
          totalBuyPhp += record.totalPhp;
          matchLots(lot, sellLots, -1);
          if (lot.remainingAmount > 0) buyLots.push(lot);
        } else {
          totalSoldAmount += record.currencyAmount;
          totalSellPhp += record.totalPhp;
          matchLots(lot, buyLots, 1);
          if (lot.remainingAmount > 0) sellLots.push(lot);
        }
      }

      const hasMatchedLots = matchedSoldAmount > 0;
      const roundedMatchedBuyCostPhp = roundMoney(matchedBuyCostPhp);
      const roundedMatchedSellRevenuePhp = roundMoney(matchedSellRevenuePhp);

      return {
        currency,
        totalBoughtAmount,
        totalBuyPhp,
        totalSoldAmount,
        totalSellPhp,
        averageBuyRate: hasMatchedLots ? roundedMatchedBuyCostPhp / matchedSoldAmount : null,
        matchedSoldAmount,
        matchedBuyCostPhp: hasMatchedLots ? roundedMatchedBuyCostPhp : null,
        matchedSellRevenuePhp: hasMatchedLots ? roundedMatchedSellRevenuePhp : null,
        estimatedIncomePhp: hasMatchedLots ? roundMoney(estimatedIncomePhp) : null,
        unmatchedBuyAmount: buyLots.reduce((sum, lot) => sum + lot.remainingAmount, 0),
        unmatchedSellAmount: sellLots.reduce((sum, lot) => sum + lot.remainingAmount, 0)
      };
    })
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}
