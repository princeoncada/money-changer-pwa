"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

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
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setDecimalInput(value: string, setter: (value: string) => void) {
    const next = sanitizeDecimalInput(value);
    if (next === null) return;

    setSaved(false);
    setter(next);
  }

  async function handleSave() {
    if (hasErrors) return;
    if (editingRecord) {
      await transactionRouter.update(editingRecord.id, formForSave);
    } else {
      await transactionRouter.create(formForSave);
    }
    setSaved(true);
    setForm(emptyInput());
    setCurrencyAmountInput("");
    setRateInput("");
    onSaved();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <CardTitle>{editingRecord ? "Edit Record" : "Encode Record"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {saved && <Alert>Record saved on this phone.</Alert>}
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
              <Input
                value={form.customerName}
                onChange={(event) => setField("customerName", event.target.value)}
                placeholder="Customer full name"
              />
            </Field>
            <Field label="OR Number" error={saveValidation.errors.orNumber}>
              <Input
                value={form.orNumber}
                onChange={(event) => setField("orNumber", event.target.value)}
                placeholder="Official receipt number"
              />
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
            <Field label="Transaction Type" error={saveValidation.errors.transactionType}>
              <Select
                value={form.transactionType}
                onChange={(event) => setField("transactionType", event.target.value as TransactionInput["transactionType"])}
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
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
