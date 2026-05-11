"use client";

import { FileText, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DateRangeFilter,
  defaultDateFilter,
  matchesDateFilter,
  type DateFilter
} from "@/components/date-range-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateDailyTotals, calculateIncomeReports } from "@/lib/calculations";
import { transactionRouter } from "@/lib/local-api/transactions";
import {
  cn,
  formatForeignCurrencyAmount,
  formatPeso,
  formatRate,
  loadAppPreferences,
  saveAppPreference
} from "@/lib/utils";
import type { CurrencyIncomeReport, DailyTotals as DailyTotalsType, Transaction } from "@/types/transaction";

export function DailyTotals({ refreshKey }: { refreshKey: number }) {
  const [dateFilter, setDateFilter] = useState<DateFilter>(defaultDateFilter);
  const [records, setRecords] = useState<Transaction[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);

  useEffect(() => {
    transactionRouter.exportAll().then(setRecords);
  }, [refreshKey]);

  useEffect(() => {
    setDateFilter(loadAppPreferences().totalsDateFilter);
  }, []);

  const currencies = useMemo(
    () => Array.from(new Set(records.map((record) => record.currency))).sort(),
    [records]
  );
  const filteredRecords = useMemo(
    () =>
      records
        .filter((record) => matchesDateFilter(record, dateFilter))
        .filter((record) => selectedCurrencies.length === 0 || selectedCurrencies.includes(record.currency)),
    [dateFilter, records, selectedCurrencies]
  );
  const totals = useMemo<DailyTotalsType>(
    () => calculateDailyTotals("", filteredRecords),
    [filteredRecords]
  );
  const incomeReports = useMemo(() => calculateIncomeReports(filteredRecords), [filteredRecords]);
  const netCashFlow = totals.totalSellPhp - totals.totalBuyPhp;
  const totalEstimatedIncome = incomeReports.reduce(
    (sum, report) => sum + (report.estimatedIncomePhp ?? 0),
    0
  );
  const hasPendingIncome = incomeReports.some((report) => report.unmatchedSellAmount > 0);

  const generatedAt = new Date().toLocaleString();

  const dateRangeLabel =
    dateFilter.from && dateFilter.to
      ? `${dateFilter.from} to ${dateFilter.to}`
      : dateFilter.from
        ? `From ${dateFilter.from}`
        : dateFilter.to
          ? `Until ${dateFilter.to}`
          : "All dates";

  const currencyFilterLabel =
    selectedCurrencies.length > 0 ? selectedCurrencies.join(", ") : "All currencies";

  function printReport() {
    window.print();
  }

  const netCashFlowHelper =
    netCashFlow < 0
      ? "More PHP was spent buying foreign currency than received from selling in this period."
      : netCashFlow > 0
        ? "More PHP was received from selling foreign currency than spent buying in this period."
        : "BUY and SELL PHP totals are balanced for this period.";

  function toggleCurrency(currency: string) {
    setSelectedCurrencies((current) =>
      current.includes(currency) ? current.filter((value) => value !== currency) : [...current, currency]
    );
  }

  function setTotalsDateFilter(value: DateFilter) {
    setDateFilter(value);
    saveAppPreference("totalsDateFilter", value);
  }

  return (
    <div className="space-y-4">
      <DateRangeFilter value={dateFilter} onChange={setTotalsDateFilter} />

      <Button
        type="button"
        variant="outline"
        onClick={printReport}
        className="print:hidden"
      >
        <FileText className="mr-2 h-4 w-4" />
        Save / Print PDF
      </Button>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <Label>Currency filters</Label>
          <Button type="button" variant="outline" size="sm" className="rounded-md" onClick={() => setSelectedCurrencies([])}>
            Clear All Filters
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {currencies.length > 0 ? (
            currencies.map((currency) => (
              <FilterCheck
                key={currency}
                label={currency}
                checked={selectedCurrencies.includes(currency)}
                onCheckedChange={() => toggleCurrency(currency)}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No currencies yet.</p>
          )}
        </div>
      </div>

      <TooltipProvider>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <CountCard label="Total" value={String(totals.totalRecords)} />
            <CountCard label="BUY" value={String(totals.totalBuyRecords)} />
            <CountCard label="SELL" value={String(totals.totalSellRecords)} />
          </div>

          <Card className="border border-border bg-card shadow-lg">
            <CardHeader className="pb-0">
              <CardTitle>Financial Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <FinancialMetric
                label="Net Cash Flow"
                value={formatPeso(netCashFlow)}
                valueClassName={amountTone(netCashFlow)}
                helper={netCashFlowHelper}
                tooltip="Net Cash Flow is not income. It means Total SELL PHP minus Total BUY PHP for the selected period. Negative means more PHP was spent buying foreign currency than received from selling during this period."
              >
                <div className="pt-2 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
                  <CashFlowPart label="SELL PHP" value={formatPeso(totals.totalSellPhp)} tone="sell" />
                  <div className="flex items-center justify-center text-lg font-semibold text-muted-foreground">-</div>
                  <CashFlowPart label="BUY PHP" value={formatPeso(totals.totalBuyPhp)} tone="buy" />
                </div>
              </FinancialMetric>
              <div className="h-px bg-border" />
              <FinancialMetric
                label="Estimated Income"
                value={formatPeso(totalEstimatedIncome)}
                valueClassName={amountTone(totalEstimatedIncome)}
                helper={
                  hasPendingIncome
                    ? "Some SELL records have no matching BUY records in this selected period, so part of the income is pending."
                    : "Calculated from matched BUY and SELL records for this selected period."
                }
                helperClassName={hasPendingIncome ? "text-amber-700" : undefined}
                tooltip="Estimated Income is calculated only from matched BUY and SELL records in the selected period using average buy cost. It is not manually encoded."
              />
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-normal">Detailed Reports</h2>
          <p className="text-sm text-muted-foreground">Review currency totals or matched income details.</p>
        </div>
        <Tabs defaultValue="currency" className="space-y-3">
          <TabsList className="grid w-full grid-cols-2 rounded-lg p-1 group-data-horizontal/tabs:h-auto">
            <TabsTrigger
              value="currency"
              className="h-auto min-w-0 truncate rounded-md px-2 py-2 text-center text-sm whitespace-nowrap hover:text-emerald-700"
            >
              Currency Totals
            </TabsTrigger>
            <TabsTrigger
              value="income"
              className="h-auto min-w-0 truncate rounded-md px-2 py-2 text-center text-sm whitespace-nowrap hover:text-emerald-700"
            >
              Income Report
            </TabsTrigger>
          </TabsList>
          <TabsContent value="currency" className="mt-3">
            {totals.byCurrency.length > 0 ? (
              <div className="w-full overflow-x-auto rounded-md border border-border bg-card">
                <Table className="min-w-[480px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Currency</TableHead>
                      <TableHead>Bought Amount</TableHead>
                      <TableHead>Sold Amount</TableHead>
                      <TableHead>BUY PHP</TableHead>
                      <TableHead>SELL PHP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {totals.byCurrency.map((currency) => (
                      <TableRow key={currency.currency}>
                        <TableCell className="font-semibold">{currency.currency}</TableCell>
                        <TableCell>{formatForeignCurrencyAmount(currency.boughtAmount, currency.currency)}</TableCell>
                        <TableCell>{formatForeignCurrencyAmount(currency.soldAmount, currency.currency)}</TableCell>
                        <TableCell>{formatPeso(currency.buyTotalPhp)}</TableCell>
                        <TableCell>{formatPeso(currency.sellTotalPhp)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                No currency totals for this selection.
              </p>
            )}
          </TabsContent>
          <TabsContent value="income" className="mt-3">
            {incomeReports.length > 0 ? (
              <div className="space-y-3">
                {incomeReports.map((report) => (
                  <IncomeReportRow key={report.currency} report={report} />
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                No income report for this selection.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </section>

      <section className="print-report hidden print:block">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Alshizamin Money Changer</h1>
          <p className="text-lg font-semibold">FX Totals Report</p>
          <p>Date Range: {dateRangeLabel}</p>
          <p>Generated: {generatedAt}</p>
          <p>
            Currency Filter:{" "}
            {selectedCurrencies.length > 0 ? selectedCurrencies.join(", ") : "All currencies"}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div>Total Records: {filteredRecords.length}</div>
          <div>BUY Records: {totals.totalBuyRecords}</div>
          <div>SELL Records: {totals.totalSellRecords}</div>
          <div>Total BUY PHP: {formatPeso(totals.totalBuyPhp)}</div>
          <div>Total SELL PHP: {formatPeso(totals.totalSellPhp)}</div>
          <div>Net PHP Cash Flow: {formatPeso(netCashFlow)}</div>
          <div>Total Estimated Income: {formatPeso(totalEstimatedIncome)}</div>
        </div>

        <h2 className="mb-2 text-lg font-bold">Currency Totals</h2>
        <table className="mb-6 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th>Currency</th>
              <th>Bought Amount</th>
              <th>Sold Amount</th>
              <th>BUY PHP</th>
              <th>SELL PHP</th>
            </tr>
          </thead>
          <tbody>
            {totals.byCurrency.map((currency) => (
              <tr key={currency.currency}>
                <td>{currency.currency}</td>
                <td>{formatForeignCurrencyAmount(currency.boughtAmount, currency.currency)}</td>
                <td>{formatForeignCurrencyAmount(currency.soldAmount, currency.currency)}</td>
                <td>{formatPeso(currency.buyTotalPhp)}</td>
                <td>{formatPeso(currency.sellTotalPhp)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="mb-2 text-lg font-bold">Income Report</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th>Currency</th>
              <th>Total Bought</th>
              <th>Total Sold</th>
              <th>Avg Buy Rate</th>
              <th>Avg Sell Rate</th>
              <th>Matched Sold</th>
              <th>Estimated Income</th>
              <th>Unmatched Buy</th>
              <th>Unmatched Sell</th>
            </tr>
          </thead>
          <tbody>
            {incomeReports.map((report) => (
              <tr key={report.currency}>
                <td>{report.currency}</td>
                <td>{formatForeignCurrencyAmount(report.totalBoughtAmount, report.currency)}</td>
                <td>{formatForeignCurrencyAmount(report.totalSoldAmount, report.currency)}</td>
                {report.averageBuyRate === null ? (
                  <td>Pending</td>
                ) : (
                  <td>{formatRate(report.averageBuyRate)}</td>
                )}
                {report.averageSellRate === null ? (
                  <td>Pending</td>
                ) : (
                  <td>{formatRate(report.averageSellRate)}</td>
                )}
                <td>{formatForeignCurrencyAmount(report.matchedSoldAmount, report.currency)}</td>
                <td>
                  {report.estimatedIncomePhp === null
                    ? "Pending"
                    : formatPeso(report.estimatedIncomePhp)}
                </td>
                <td>{formatForeignCurrencyAmount(report.unmatchedBuyAmount, report.currency)}</td>
                <td>{formatForeignCurrencyAmount(report.unmatchedSellAmount, report.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function IncomeReportRow({ report }: { report: CurrencyIncomeReport }) {
  const hasMatchedIncome = report.estimatedIncomePhp !== null;
  const message =
    report.totalSoldAmount > 0 && report.totalBoughtAmount === 0
      ? "Income pending. No matching BUY records in this selected period."
      : report.totalBoughtAmount > 0 && report.totalSoldAmount === 0
        ? "No income yet. BUY inventory is unmatched."
        : null;

  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-md bg-muted px-2 py-1 text-sm font-semibold">{report.currency}</span>
        {hasMatchedIncome ? (
          <span className={cn("text-sm font-semibold", amountTone(report.estimatedIncomePhp ?? 0))}>
            Income {formatPeso(report.estimatedIncomePhp ?? 0)}
          </span>
        ) : report.totalSoldAmount > 0 ? (
          <span className="rounded-md bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-700">Pending</span>
        ) : null}
      </div>

      {message && <p className="mb-3 text-sm text-muted-foreground">{message}</p>}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Metric label="Bought Amount" value={formatForeignCurrencyAmount(report.totalBoughtAmount, report.currency)} />
        <Metric label="Sold Amount" value={formatForeignCurrencyAmount(report.totalSoldAmount, report.currency)} />
        <Metric label="Matched Sold Amount" value={formatForeignCurrencyAmount(report.matchedSoldAmount, report.currency)} />
        <Metric label="Avg Buy Rate" value={report.averageBuyRate === null ? "Pending" : formatRate(report.averageBuyRate)} />
        <Metric label="Avg Sell Rate" value={report.averageSellRate === null ? "Pending" : formatRate(report.averageSellRate)} />
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
        <Metric label="Unmatched Buy Amount" value={formatForeignCurrencyAmount(report.unmatchedBuyAmount, report.currency)} />
        <Metric label="Unmatched Sell Amount" value={formatForeignCurrencyAmount(report.unmatchedSellAmount, report.currency)} />
      </div>
    </div>
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

function CashFlowPart({ label, value, tone }: { label: string; value: string; tone: "sell" | "buy" }) {
  return (
    <div
      className={cn(
        "rounded-md border bg-card px-2.5 py-2",
        tone === "sell" ? "border-emerald-200" : "border-red-200"
      )}
    >
      <p className={cn("text-[0.7rem] font-medium", tone === "sell" ? "text-emerald-700" : "text-red-700")}>
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold leading-snug">{value}</p>
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border border-border bg-card shadow-lg">
      <CardContent className="p-3 text-center">
        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-normal">{value}</p>
      </CardContent>
    </Card>
  );
}

function FinancialMetric({
  label,
  value,
  valueClassName,
  helper,
  helperClassName,
  tooltip,
  children
}: {
  label: string;
  value: string;
  valueClassName?: string;
  helper?: string;
  helperClassName?: string;
  tooltip?: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger
              className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              aria-label={`${label} explanation`}
            >
              <Info className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <p className={cn("text-2xl font-bold tracking-normal", valueClassName)}>{value}</p>
      {helper && <p className={cn("text-xs leading-snug text-muted-foreground", helperClassName)}>{helper}</p>}
      {children}
    </div>
  );
}

function amountTone(value: number) {
  if (value > 0) return "text-emerald-700";
  if (value < 0) return "text-red-700";
  return "text-foreground";
}

function FilterCheck({
  label,
  checked,
  onCheckedChange
}: {
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm font-medium">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span>{label}</span>
    </label>
  );
}
