"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { CalendarIcon, Check } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateTotalPhp } from "@/lib/calculations";
import { transactionRouter } from "@/lib/local-api/transactions";
import { cn, formatPeso, todayLocal } from "@/lib/utils";
import { findDuplicateWarnings, validateTransactionInput } from "@/lib/validation";
import type { Transaction, TransactionInput } from "@/types/transaction";

const emptyInput = (): TransactionInput => ({
  date: todayLocal(),
  customerName: "",
  orNumber: "",
  currency: "USD",
  transactionType: "BUY",
  currencyAmount: 0,
  rate: 0,
  totalPhp: 0,
});

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/,/g, "").trim();

  if (cleaned === "") return "";
  if (cleaned === ".") return "0.";
  if (!/^\d*\.?\d*$/.test(cleaned)) return null;

  return cleaned;
}

function decimalStringToNumber(value: string): number | null {
  if (!value || value === "." || value.endsWith(".")) return null;

  const normalized = value.startsWith(".") ? `0${value}` : value;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

type Props = {
  editingRecord?: Transaction | null;
  onSaved: (recordId?: string) => void;
  onCancelEdit: () => void;
};

export function TransactionForm({ editingRecord, onSaved, onCancelEdit }: Props) {
  const [form, setForm] = useState<TransactionInput>(emptyInput);
  const [currencyAmountInput, setCurrencyAmountInput] = useState("");
  const [rateInput, setRateInput] = useState("");
  const [existingRecords, setExistingRecords] = useState<Transaction[]>([]);
  const [customerComboboxOpen, setCustomerComboboxOpen] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    transactionRouter.exportAll().then((records) => {
      if (active) setExistingRecords(records);
    });
    return () => {
      active = false;
    };
  }, [editingRecord]);

  useEffect(() => {
    if (editingRecord) {
      const { id, createdAt, updatedAt, ...input } = editingRecord;
      setForm(input);
      setCurrencyAmountInput(String(input.currencyAmount || ""));
      setRateInput(String(input.rate || ""));
      return;
    }
    setForm(emptyInput());
    setCurrencyAmountInput("");
    setRateInput("");
  }, [editingRecord]);

  const parsedCurrencyAmount = decimalStringToNumber(currencyAmountInput);
  const parsedRate = decimalStringToNumber(rateInput);
  const computedTotalPhp =
    parsedCurrencyAmount !== null && parsedRate !== null ? calculateTotalPhp(parsedCurrencyAmount, parsedRate) : 0;
  const formForSave = useMemo(
    () => ({
      ...form,
      currencyAmount: parsedCurrencyAmount ?? 0,
      rate: parsedRate ?? 0,
      totalPhp: computedTotalPhp
    }),
    [computedTotalPhp, form, parsedCurrencyAmount, parsedRate]
  );
  const saveValidation = useMemo(() => validateTransactionInput(formForSave), [formForSave]);
  const hasErrors = Object.keys(saveValidation.errors).length > 0;
  const customerSuggestions = useMemo(() => {
    const normalizedCurrent = form.customerName.trim().toLowerCase();
    if (!normalizedCurrent) return [];

    const seen = new Set<string>();
    return existingRecords
      .map((record) => record.customerName.trim())
      .filter((name) => {
        if (!name) return false;
        const normalizedName = name.toLowerCase();
        if (seen.has(normalizedName)) return false;
        seen.add(normalizedName);

        return normalizedName.includes(normalizedCurrent) && normalizedName !== normalizedCurrent;
      })
      .slice(0, 8);
  }, [existingRecords, form.customerName]);

  useEffect(() => {
    let active = true;
    findDuplicateWarnings(formForSave, editingRecord?.id).then((duplicateWarnings) => {
      if (active) setWarnings([...saveValidation.warnings, ...duplicateWarnings]);
    });
    return () => {
      active = false;
    };
  }, [formForSave, editingRecord?.id, saveValidation.warnings]);

  function setField<K extends keyof TransactionInput>(key: K, value: TransactionInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setDecimalInput(value: string, setter: (value: string) => void) {
    const next = sanitizeDecimalInput(value);
    if (next === null) return;

    setter(next);
  }

  async function handleSave() {
    if (hasErrors) return;
    const wasEditing = Boolean(editingRecord);

    let savedRecord: Transaction;
    if (editingRecord) {
      savedRecord = await transactionRouter.update(editingRecord.id, formForSave);
    } else {
      savedRecord = await transactionRouter.create(formForSave);
    }

    toast.success(wasEditing ? "Record updated" : "Record saved", {
      description: wasEditing
        ? "The transaction was updated on this phone."
        : "The transaction was saved on this phone.",
      duration: 3000
    });

    setExistingRecords(await transactionRouter.exportAll());
    setForm(emptyInput());
    setCurrencyAmountInput("");
    setRateInput("");
    onSaved(wasEditing ? savedRecord.id : undefined);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="space-y-4 p-4">
          {editingRecord && <p className="text-sm font-medium text-muted-foreground">Editing record</p>}
          {warnings.length > 0 && (
            <Alert>
              <ul className="space-y-1">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Alert>
          )}

          <div className="grid gap-3">
            <Field label="Date" error={saveValidation.errors.date}>
              <DatePicker value={form.date} onChange={(date) => setField("date", date)} />
            </Field>
            <Field label="Customer Name / KYC" error={saveValidation.errors.customerName}>
              <CustomerCombobox
                value={form.customerName}
                open={customerComboboxOpen}
                suggestions={customerSuggestions}
                onOpenChange={setCustomerComboboxOpen}
                onChange={(customerName) => setField("customerName", customerName)}
              />
            </Field>
            <Field label="OR Number" error={saveValidation.errors.orNumber}>
              <Input
                value={form.orNumber}
                onChange={(event) => setField("orNumber", event.target.value)}
                placeholder="Official receipt number"
              />
            </Field>
            <Field label="Transaction Type" error={saveValidation.errors.transactionType}>
              <Select
                value={form.transactionType}
                onValueChange={(value) => setField("transactionType", value as TransactionInput["transactionType"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[80] border border-border bg-white shadow-xl">
                  <SelectItem value="BUY">BUY</SelectItem>
                  <SelectItem value="SELL">SELL</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Currency" error={saveValidation.errors.currency}>
              <Select value={form.currency} onValueChange={(value) => setField("currency", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[80] border border-border bg-white shadow-xl">
                  {["USD", "EUR", "JPY", "GBP", "AUD", "CAD", "SGD", "HKD", "KRW", "CNY"].map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <NumberField
              label="Currency Amount"
              value={currencyAmountInput}
              error={saveValidation.errors.currencyAmount}
              onChange={(value) => setDecimalInput(value, setCurrencyAmountInput)}
            />
            <NumberField
              label={form.transactionType === "BUY" ? "Buying Rate" : "Selling Rate"}
              value={rateInput}
              error={saveValidation.errors.rate}
              onChange={(value) => setDecimalInput(value, setRateInput)}
            />
            <Field label="Total PHP" error={saveValidation.errors.totalPhp}>
              <Input value={formatPeso(computedTotalPhp)} readOnly className="bg-muted font-semibold" />
            </Field>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button type="button" onClick={handleSave} disabled={hasErrors}>
              <Check className="h-5 w-5" />
              {editingRecord ? "Update" : "Save"}
            </Button>
            {editingRecord && (
              <Button type="button" variant="outline" onClick={onCancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = useMemo(() => parseDate(value), [value]);
  const label = selected ? format(selected, "MMM d, yyyy") : "Pick a date";

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-full justify-start bg-background text-left font-normal"
        )}
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <span>{label}</span>
      </PopoverTrigger>
      <PopoverContent
        className="z-[80] w-[var(--radix-popover-trigger-width)] border border-border bg-white p-0 shadow-xl"
        align="start"
      >
        <Calendar
          className="w-full bg-white"
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) onChange(formatDate(date));
          }}
          defaultMonth={selected}
        />
      </PopoverContent>
    </Popover>
  );
}

function CustomerCombobox({
  value,
  open,
  suggestions,
  onOpenChange,
  onChange
}: {
  value: string;
  open: boolean;
  suggestions: string[];
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  return (
    <Popover open={open && suggestions.length > 0} onOpenChange={onOpenChange}>
      <PopoverAnchor className="block w-full">
        <Input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            onOpenChange(true);
          }}
          onFocus={() => onOpenChange(true)}
          placeholder="Customer full name"
          autoComplete="off"
        />
      </PopoverAnchor>
      <PopoverContent
        className="z-[80] w-[var(--radix-popper-anchor-width)] border border-border bg-white p-1 shadow-xl"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command shouldFilter={false} className="rounded-md bg-white p-0">
          <CommandList>
            <CommandGroup>
              {suggestions.map((customerName) => (
                <CommandItem
                  key={customerName.toLowerCase()}
                  value={customerName}
                  className="cursor-pointer bg-white"
                  onMouseDown={(event) => event.preventDefault()}
                  onSelect={() => {
                    onChange(customerName);
                    onOpenChange(false);
                  }}
                >
                  {customerName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function NumberField({
  label,
  value,
  error,
  onChange
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} error={error}>
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0.00"
      />
    </Field>
  );
}

function parseDate(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day);
}

function formatDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}
