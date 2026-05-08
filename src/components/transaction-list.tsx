"use client";

import { Edit3, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  DateRangeFilter,
  defaultDateFilter,
  matchesDateFilter,
  type DateFilter
} from "@/components/date-range-filter";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transactionRouter } from "@/lib/local-api/transactions";
import { formatNumber, formatPeso, formatRate, normalizeText } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

type Props = {
  refreshKey: number;
  onEdit: (record: Transaction) => void;
};

export function TransactionList({ refreshKey, onEdit }: Props) {
  const [dateFilter, setDateFilter] = useState<DateFilter>(defaultDateFilter);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Transaction[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const loadRecords = useCallback(async () => {
    const normalizedQuery = normalizeText(query);
    const nextRecords = (await transactionRouter.exportAll())
      .filter((record) => matchesDateFilter(record, dateFilter))
      .filter(
        (record) =>
          !normalizedQuery ||
          normalizeText(record.customerName).includes(normalizedQuery) ||
          normalizeText(record.orNumber).includes(normalizedQuery)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    setRecords(nextRecords);
  }, [dateFilter, query]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords, refreshKey]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    await transactionRouter.delete(deleteTarget.id);
    setDeleteTarget(null);
    await loadRecords();
  }

  return (
    <div className="space-y-4">
      <DateRangeFilter value={dateFilter} onChange={setDateFilter} />

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-soft">
        <div className="space-y-2">
          <Label>Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input
              className="pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Customer or OR number"
            />
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">No records for this selection.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <Card key={record.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{record.customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.date} - OR {record.orNumber}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-md bg-muted px-2 py-1 text-sm font-semibold">{record.currency}</span>
                    <span
                      className={
                        record.transactionType === "BUY"
                          ? "rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                          : "rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white"
                      }
                    >
                      {record.transactionType}
                    </span>
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

      <Dialog
        open={Boolean(deleteTarget)}
        title="Delete record?"
        description="This removes the record from this phone."
        confirmLabel="Delete"
        destructive
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      >
        {deleteTarget && (
          <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
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
