"use client";

import { Edit3, Search, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { cn, formatNumber, formatPeso, formatRate, normalizeText } from "@/lib/utils";
import type { Transaction, TransactionType } from "@/types/transaction";

type Props = {
  refreshKey: number;
  onEdit: (record: Transaction) => void;
};

export function TransactionList({ refreshKey, onEdit }: Props) {
  const [dateFilter, setDateFilter] = useState<DateFilter>(defaultDateFilter);
  const [query, setQuery] = useState("");
  const [allRecords, setAllRecords] = useState<Transaction[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

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
      <DateRangeFilter value={dateFilter} onChange={setDateFilter} />

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-soft">
        <div className="space-y-2">
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
            <Button type="button" variant="outline" size="sm" onClick={clearAdvancedFilters}>
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
        <div className="space-y-3">
          {records.map((record) => (
            <Card key={record.id} className="border border-border bg-card shadow-sm">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{record.customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.date} - OR {record.orNumber}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Info label="Currency Amount" value={formatNumber(record.currencyAmount)} />
                  <Info label={record.transactionType === "BUY" ? "Buying Rate" : "Selling Rate"} value={formatRate(record.rate)} />
                  <Info label="Total PHP" value={formatPeso(record.totalPhp)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
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
          ))}
        </div>
      )}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete record?</DialogTitle>
            <DialogDescription>This removes the record from this phone.</DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              <DeleteDetail label="Customer" value={deleteTarget.customerName} />
              <DeleteDetail label="Date" value={deleteTarget.date} />
              <DeleteDetail label="OR Number" value={deleteTarget.orNumber} />
              <DeleteDetail label="Type" value={deleteTarget.transactionType} />
              <DeleteDetail label="Currency" value={deleteTarget.currency} />
              <DeleteDetail label="Amount" value={formatNumber(deleteTarget.currencyAmount)} />
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
    <div className="rounded-md bg-muted p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
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
