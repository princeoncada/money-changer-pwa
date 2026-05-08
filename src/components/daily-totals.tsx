"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DateRangeFilter,
  defaultDateFilter,
  matchesDateFilter,
  type DateFilter
} from "@/components/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateDailyTotals, calculateIncomeReports } from "@/lib/calculations";
import { transactionRouter } from "@/lib/local-api/transactions";
import { formatNumber, formatPeso, formatRate } from "@/lib/utils";
import type { CurrencyIncomeReport, DailyTotals as DailyTotalsType, Transaction } from "@/types/transaction";

export function DailyTotals({ refreshKey }: { refreshKey: number }) {
  const [dateFilter, setDateFilter] = useState<DateFilter>(defaultDateFilter);
  const [records, setRecords] = useState<Transaction[]>([]);

  useEffect(() => {
    transactionRouter.exportAll().then(setRecords);
  }, [refreshKey]);

  const filteredRecords = useMemo(
    () => records.filter((record) => matchesDateFilter(record, dateFilter)),
    [dateFilter, records]
  );
  const totals = useMemo<DailyTotalsType>(
    () => calculateDailyTotals("", filteredRecords),
    [filteredRecords]
  );
  const incomeReports = useMemo(() => calculateIncomeReports(filteredRecords), [filteredRecords]);
  const netPhpMovement = totals.totalSellPhp - totals.totalBuyPhp;

  return (
    <div className="space-y-4">
      <DateRangeFilter value={dateFilter} onChange={setDateFilter} />

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Total Records" value={String(totals.totalRecords)} />
        <SummaryCard label="BUY Records" value={String(totals.totalBuyRecords)} />
        <SummaryCard label="SELL Records" value={String(totals.totalSellRecords)} />
        <SummaryCard label="Net PHP Movement" value={formatPeso(netPhpMovement)} />
      </div>

      <ReportSection title="PHP Totals">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Total BUY PHP" value={formatPeso(totals.totalBuyPhp)} />
          <Metric label="Total SELL PHP" value={formatPeso(totals.totalSellPhp)} />
        </div>
      </ReportSection>

      <ReportSection title="By Currency">
        {totals.byCurrency.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-border">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[0.8fr_1fr_1fr_1fr_1fr] gap-2 bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                <span>Currency</span>
                <span>Bought Amount</span>
                <span>Sold Amount</span>
                <span>BUY PHP</span>
                <span>SELL PHP</span>
              </div>
              {totals.byCurrency.map((currency) => (
                <div
                  key={currency.currency}
                  className="grid grid-cols-[0.8fr_1fr_1fr_1fr_1fr] gap-2 border-t border-border px-3 py-2 text-sm"
                >
                  <span className="font-semibold">{currency.currency}</span>
                  <span>{formatNumber(currency.boughtAmount)}</span>
                  <span>{formatNumber(currency.soldAmount)}</span>
                  <span>{formatPeso(currency.buyTotalPhp)}</span>
                  <span>{formatPeso(currency.sellTotalPhp)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No currency totals for this selection.</p>
        )}
      </ReportSection>

      <ReportSection title="Income Report">
        {incomeReports.length > 0 ? (
          <div className="space-y-3">
            {incomeReports.map((report) => (
              <IncomeReportRow key={report.currency} report={report} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No income report for this selection.</p>
        )}
      </ReportSection>
    </div>
  );
}

function IncomeReportRow({ report }: { report: CurrencyIncomeReport }) {
  const hasMatchedIncome = report.totalBoughtAmount > 0 && report.totalSoldAmount > 0 && report.matchedSoldAmount > 0;
  const message =
    report.totalSoldAmount > 0 && report.totalBoughtAmount === 0
      ? "Income pending. No matching BUY records in this selected period."
      : report.totalBoughtAmount > 0 && report.totalSoldAmount === 0
        ? "No income yet. BUY inventory is unmatched."
        : null;

  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-md bg-muted px-2 py-1 text-sm font-semibold">{report.currency}</span>
        {hasMatchedIncome && report.estimatedIncomePhp !== null && (
          <span className="text-sm font-semibold">Income {formatPeso(report.estimatedIncomePhp)}</span>
        )}
      </div>

      {message && <p className="mb-3 text-sm text-muted-foreground">{message}</p>}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Metric label="Avg Buy Rate" value={report.averageBuyRate === null ? "Pending" : formatRate(report.averageBuyRate)} />
        <Metric label="Matched Sold Amount" value={formatNumber(report.matchedSoldAmount)} />
        <Metric
          label="Matched Buy Cost"
          value={report.matchedBuyCostPhp === null ? "Pending" : formatPeso(report.matchedBuyCostPhp)}
        />
        <Metric
          label="Matched Sell Revenue"
          value={report.matchedSellRevenuePhp === null ? "Pending" : formatPeso(report.matchedSellRevenuePhp)}
        />
        <Metric
          label="Estimated Income"
          value={
            !hasMatchedIncome
              ? report.totalSoldAmount > 0
                ? "Pending"
                : "No income yet"
              : formatPeso(report.estimatedIncomePhp ?? 0)
          }
        />
        <Metric label="Unmatched Buy Amount" value={formatNumber(report.unmatchedBuyAmount)} />
        <Metric label="Unmatched Sell Amount" value={formatNumber(report.unmatchedSellAmount)} />
      </div>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold tracking-normal">{value}</p>
      </CardContent>
    </Card>
  );
}
