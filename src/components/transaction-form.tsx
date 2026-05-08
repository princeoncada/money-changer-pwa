"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { calculateTotalPhp } from "@/lib/calculations";
import { transactionRouter } from "@/lib/local-api/transactions";
import { formatPeso, todayLocal } from "@/lib/utils";
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
  onSaved: () => void;
  onCancelEdit: () => void;
};

export function TransactionForm({ editingRecord, onSaved, onCancelEdit }: Props) {
  const [form, setForm] = useState<TransactionInput>(emptyInput);
  const [currencyAmountInput, setCurrencyAmountInput] = useState("");
  const [rateInput, setRateInput] = useState("");
  const [existingRecords, setExistingRecords] = useState<Transaction[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
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

  function selectCustomerSuggestion(customerName: string) {
    setField("customerName", customerName);
    setShowCustomerSuggestions(false);
  }

  function setDecimalInput(value: string, setter: (value: string) => void) {
    const next = sanitizeDecimalInput(value);
    if (next === null) return;

    setter(next);
  }

  async function handleSave() {
    if (hasErrors) return;
    const wasEditing = Boolean(editingRecord);

    if (editingRecord) {
      await transactionRouter.update(editingRecord.id, formForSave);
    } else {
      await transactionRouter.create(formForSave);
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
    onSaved();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="space-y-4 p-4">
          {editingRecord && <p className="text-sm font-medium text-muted-foreground">Editing record</p>}
          {warnings.length > 0 && (
            <Alert variant="warning">
              <ul className="space-y-1">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Alert>
          )}

          <div className="grid gap-3">
            <Field label="Date" error={saveValidation.errors.date}>
              <Input type="date" value={form.date} onChange={(event) => setField("date", event.target.value)} />
            </Field>
            <Field label="Customer Name / KYC" error={saveValidation.errors.customerName}>
              <div className="relative">
                <Input
                  value={form.customerName}
                  onChange={(event) => {
                    setField("customerName", event.target.value);
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  onBlur={() => window.setTimeout(() => setShowCustomerSuggestions(false), 120)}
                  placeholder="Customer full name"
                  autoComplete="off"
                />
                {showCustomerSuggestions && customerSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-56 overflow-y-auto rounded-md border border-border bg-white p-1 shadow-xl">
                    {customerSuggestions.map((customerName) => (
                      <button
                        key={customerName.toLowerCase()}
                        type="button"
                        className="block w-full rounded-sm bg-white px-3 py-3 text-left text-sm font-medium hover:bg-muted focus:bg-muted focus:outline-none"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectCustomerSuggestion(customerName)}
                      >
                        {customerName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                onChange={(event) => setField("transactionType", event.target.value as TransactionInput["transactionType"])}
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </Select>
            </Field>
            <Field label="Currency" error={saveValidation.errors.currency}>
              <Select value={form.currency} onChange={(event) => setField("currency", event.target.value)}>
                {["USD", "EUR", "JPY", "GBP", "AUD", "CAD", "SGD", "HKD", "KRW", "CNY"].map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
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
              <div className="flex h-12 items-center rounded-md border border-input bg-muted px-3 text-lg font-semibold">
                {formatPeso(computedTotalPhp)}
              </div>
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
