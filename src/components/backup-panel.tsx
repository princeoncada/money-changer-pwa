"use client";

import { Download, Edit3, Plus, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  loadCurrencyTypes,
  normalizeCurrencyCode,
  saveCurrencyTypes,
  type CurrencyType
} from "@/lib/currencies";
import { transactionRouter } from "@/lib/local-api/transactions";
import { todayLocal } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

const emptyCurrencyDraft: CurrencyType = {
  code: "",
  name: "",
  symbol: ""
};

export function BackupPanel({ onChanged }: { onChanged: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [currencyTypes, setCurrencyTypes] = useState<CurrencyType[]>(() => loadCurrencyTypes());
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [editingCurrencyCode, setEditingCurrencyCode] = useState<string | null>(null);
  const [currencyDraft, setCurrencyDraft] = useState<CurrencyType>(emptyCurrencyDraft);
  const [currencyError, setCurrencyError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  async function exportJson() {
    const records = await transactionRouter.exportAll();
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alshizamin-fxd-backup-${todayLocal()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Backup saved", {
      description: "Your JSON backup was exported successfully.",
      duration: 3000
    });
  }

  async function restoreJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const records = JSON.parse(text) as Transaction[];
    const restored = await transactionRouter.restoreAll(records);
    toast.success("Backup restored", {
      description: `${restored} records restored successfully.`,
      duration: 3000
    });
    onChanged();
    event.target.value = "";
  }

  async function clearAll() {
    await transactionRouter.clearAll();
    setConfirmClear(false);
    toast.success("Records cleared", {
      description: "All saved records were removed from this phone.",
      duration: 3000
    });
    onChanged();
  }

  function openAddCurrency() {
    setEditingCurrencyCode(null);
    setCurrencyDraft(emptyCurrencyDraft);
    setCurrencyError("");
    setCurrencyDialogOpen(true);
  }

  function openEditCurrency(currency: CurrencyType) {
    setEditingCurrencyCode(currency.code);
    setCurrencyDraft(currency);
    setCurrencyError("");
    setCurrencyDialogOpen(true);
  }

  function saveCurrencyType() {
    const nextCurrency = {
      code: normalizeCurrencyCode(currencyDraft.code),
      name: currencyDraft.name.trim(),
      symbol: currencyDraft.symbol.trim()
    };

    if (!/^[A-Z]{3}$/.test(nextCurrency.code)) {
      setCurrencyError("Currency code must be 3 uppercase letters.");
      return;
    }

    if (!nextCurrency.name) {
      setCurrencyError("Currency name is required.");
      return;
    }

    if (!nextCurrency.symbol) {
      setCurrencyError("Currency symbol is required.");
      return;
    }

    const duplicate = currencyTypes.some(
      (currency) => currency.code === nextCurrency.code && currency.code !== editingCurrencyCode
    );
    if (duplicate) {
      setCurrencyError("Currency code already exists.");
      return;
    }

    const nextCurrencyTypes = editingCurrencyCode
      ? currencyTypes.map((currency) => (currency.code === editingCurrencyCode ? nextCurrency : currency))
      : [...currencyTypes, nextCurrency];

    setCurrencyTypes(nextCurrencyTypes);
    saveCurrencyTypes(nextCurrencyTypes);
    setCurrencyDialogOpen(false);
    toast.success(editingCurrencyCode ? "Currency updated" : "Currency added", {
      description: `${nextCurrency.code} - ${nextCurrency.name} is available in Encode.`,
      duration: 3000
    });
  }

  return (
    <div className="space-y-4">
      <Alert variant="warning">Data is saved only on this phone. Export backups regularly.</Alert>

      <Card className="border border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle>Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" className="w-full" onClick={exportJson}>
            <Download className="h-5 w-5" />
            Export JSON
          </Button>
          <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={restoreJson} />
          <Button type="button" variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
            <Upload className="h-5 w-5" />
            Restore JSON
          </Button>
          <Button type="button" variant="destructive" className="w-full" onClick={() => setConfirmClear(true)}>
            <Trash2 className="h-5 w-5" />
            Clear All Records
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle>Currency Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-72 overflow-auto rounded-md border border-border">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencyTypes.map((currency) => (
                  <TableRow key={currency.code}>
                    <TableCell className="font-semibold">{currency.code}</TableCell>
                    <TableCell>{currency.name}</TableCell>
                    <TableCell>{currency.symbol}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-md"
                        aria-label={`Edit ${currency.code}`}
                        onClick={() => openEditCurrency(currency)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={openAddCurrency}>
            <Plus className="h-5 w-5" />
            Add Currency
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmClear} onOpenChange={(open) => !open && setConfirmClear(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all records?</DialogTitle>
            <DialogDescription>
              This deletes every saved record from this phone. Export a backup first if needed.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" className="w-full sm:w-auto" onClick={clearAll}>
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={currencyDialogOpen} onOpenChange={setCurrencyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCurrencyCode ? "Edit Currency" : "Add Currency"}</DialogTitle>
            <DialogDescription>
              Currency records are saved locally and used by the Encode selector.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Currency Code</Label>
              <Input
                value={currencyDraft.code}
                maxLength={3}
                onChange={(event) =>
                  setCurrencyDraft((current) => ({
                    ...current,
                    code: normalizeCurrencyCode(event.target.value)
                  }))
                }
                placeholder="USD"
                autoCapitalize="characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency Name</Label>
              <Input
                value={currencyDraft.name}
                onChange={(event) =>
                  setCurrencyDraft((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
                placeholder="US Dollar"
              />
            </div>
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Input
                value={currencyDraft.symbol}
                onChange={(event) =>
                  setCurrencyDraft((current) => ({
                    ...current,
                    symbol: event.target.value
                  }))
                }
                placeholder="$"
              />
            </div>
            {currencyError && <Alert variant="warning">{currencyError}</Alert>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setCurrencyDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="w-full sm:w-auto" onClick={saveCurrencyType}>
              Save Currency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
