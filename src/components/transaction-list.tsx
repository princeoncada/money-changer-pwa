"use client";

import { Edit3, Search, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DateRangeFilter,
  defaultDateFilter,
  matchesDateFilter,
  type DateFilter
} from "@/components/date-range-filter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { transactionRouter } from "@/lib/local-api/transactions";
import {
  cn,
  formatForeignCurrencyAmount,
  formatPeso,
  formatRate,
  loadAppPreferences,
  normalizeText,
  saveAppPreference
} from "@/lib/utils";
import type { Transaction, TransactionType } from "@/types/transaction";

type Props = {
  refreshKey: number;
  onEdit: (record: Transaction) => void;
  highlightedRecordId?: string | null;
  onHighlightedRecordConsumed?: () => void;
};

export function TransactionList({
  refreshKey,
  onEdit,
  highlightedRecordId,
  onHighlightedRecordConsumed
}: Props) {
  const [dateFilter, setDateFilter] = useState<DateFilter>(defaultDateFilter);
  const [query, setQuery] = useState("");
  const [allRecords, setAllRecords] = useState<Transaction[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const recordRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const handledHighlightId = useRef<string | null>(null);

  const loadRecords = useCallback(async () => {
    setAllRecords(await transactionRouter.exportAll());
  }, []);

  const currencies = useMemo(
    () => Array.from(new Set(allRecords.map((record) => record.currency))).sort(),
    [allRecords]
  );

  const records = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    return allRecords
      .filter((record) => matchesDateFilter(record, dateFilter))
      .filter(
        (record) =>
          !normalizedQuery ||
          normalizeText(record.customerName).includes(normalizedQuery) ||
          normalizeText(record.orNumber).includes(normalizedQuery)
      )
      .filter((record) => selectedCurrencies.length === 0 || selectedCurrencies.includes(record.currency))
      .filter((record) => selectedTypes.length === 0 || selectedTypes.includes(record.transactionType))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [allRecords, dateFilter, query, selectedCurrencies, selectedTypes]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords, refreshKey]);

  useEffect(() => {
    setDateFilter(loadAppPreferences().recordsDateFilter);
  }, []);

  useEffect(() => {
    if (!highlightedRecordId) return;
    const target = allRecords.find((record) => record.id === highlightedRecordId);
    if (!target) return;

    const targetFilter = { from: target.date, to: target.date };
    setDateFilter(targetFilter);
    saveAppPreference("recordsDateFilter", targetFilter);
  }, [allRecords, highlightedRecordId]);

  function setRecordsDateFilter(value: DateFilter) {
    setDateFilter(value);
    saveAppPreference("recordsDateFilter", value);
  }

  useEffect(() => {
    if (
      !highlightedRecordId ||
      handledHighlightId.current === highlightedRecordId ||
      !records.some((record) => record.id === highlightedRecordId)
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = recordRefs.current[highlightedRecordId];
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.focus({ preventScroll: true });
      setActiveHighlightId(highlightedRecordId);
      handledHighlightId.current = highlightedRecordId;
      onHighlightedRecordConsumed?.();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [highlightedRecordId, onHighlightedRecordConsumed, records]);

  useEffect(() => {
    if (!activeHighlightId) return;

    const timeout = window.setTimeout(() => setActiveHighlightId(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [activeHighlightId]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    await transactionRouter.delete(deleteTarget.id);
    setDeleteTarget(null);
    await loadRecords();
  }

  function toggleCurrency(currency: string) {
    setSelectedCurrencies((current) =>
      current.includes(currency) ? current.filter((value) => value !== currency) : [...current, currency]
    );
  }

  function toggleType(type: TransactionType) {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((value) => value !== type) : [...current, type]
    );
  }

  function clearAdvancedFilters() {
    setSelectedCurrencies([]);
    setSelectedTypes([]);
  }

  return (
    <div className="space-y-4">
      <DateRangeFilter value={dateFilter} onChange={setRecordsDateFilter} />

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-soft">
        <div className="space-y-4">
          <Label>Search</Label>
          <InputGroup>
            <InputGroupAddon>
              <Search className="h-4 w-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Customer or OR number"
            />
          </InputGroup>
        </div>
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Advanced filters</Label>
            <Button type="button" variant="outline" size="sm" className="rounded-md" onClick={clearAdvancedFilters}>
              Clear All Filters
            </Button>
          </div>

          <FilterGroup label="Currency">
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
          </FilterGroup>

          <FilterGroup label="Transaction type">
            {(["BUY", "SELL"] as TransactionType[]).map((type) => (
              <FilterCheck
                key={type}
                label={type}
                checked={selectedTypes.includes(type)}
                onCheckedChange={() => toggleType(type)}
              />
            ))}
          </FilterGroup>
        </div>
      </div>

      {records.length === 0 ? (
        <Card className="border border-border bg-card shadow-sm">
          <CardContent className="p-4 text-sm text-muted-foreground">No records for this selection.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div
              key={record.id}
              id={`record-${record.id}`}
              ref={(element) => {
                recordRefs.current[record.id] = element;
              }}
              tabIndex={-1}
              className="rounded-lg outline-none"
            >
              <Card
                className={cn(
                  "border border-border bg-card py-0 !shadow-lg transition-colors duration-500",
                  activeHighlightId === record.id && "border-primary bg-primary/5 ring-2 ring-primary/30"
                )}
              >
                <CardContent className="space-y-2.5 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{record.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.date} - OR {record.orNumber}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <RecordBadge>{record.currency}</RecordBadge>
                        <RecordBadge
                          className={
                            record.transactionType === "BUY"
                              ? "bg-emerald-600 text-white"
                              : "bg-red-600 text-white"
                          }
                        >
                          {record.transactionType}
                        </RecordBadge>
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Info
                      label="Currency Amount"
                      value={formatForeignCurrencyAmount(record.currencyAmount, record.currency)}
                    />
                    <Info label={record.transactionType === "BUY" ? "Buying Rate" : "Selling Rate"} value={formatRate(record.rate)} />
                    <Info label="Total PHP" value={formatPeso(record.totalPhp)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => onEdit(record)}>
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => setDeleteTarget(record)}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="border border-border bg-card shadow-xl">
          <DialogHeader>
            <DialogTitle>Delete record?</DialogTitle>
            <DialogDescription>This removes the record from this phone.</DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="rounded-md border border-border bg-muted p-3 text-sm text-foreground">
              <DeleteDetail label="Customer" value={deleteTarget.customerName} />
              <DeleteDetail label="Date" value={deleteTarget.date} />
              <DeleteDetail label="OR Number" value={deleteTarget.orNumber} />
              <DeleteDetail label="Type" value={deleteTarget.transactionType} />
              <DeleteDetail label="Currency" value={deleteTarget.currency} />
              <DeleteDetail
                label="Amount"
                value={formatForeignCurrencyAmount(deleteTarget.currencyAmount, deleteTarget.currency)}
              />
              <DeleteDetail
                label={deleteTarget.transactionType === "BUY" ? "Buying Rate" : "Selling Rate"}
                value={formatRate(deleteTarget.rate)}
              />
              <DeleteDetail label="Total PHP" value={formatPeso(deleteTarget.totalPhp)} />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" className="w-full sm:w-auto" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeleteDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2 py-0.5">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted px-2 py-1.5">
      <p className="text-[0.7rem] leading-tight text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold leading-snug">{value}</p>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
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

function RecordBadge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-md bg-muted px-2 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}
