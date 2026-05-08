"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { todayLocal } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

export type FilterMode = "DAY" | "MONTH" | "RANGE";

export type DateFilter = {
  mode: FilterMode;
  day: string;
  month: string;
  startDate: string;
  endDate: string;
};

export function defaultDateFilter(): DateFilter {
  const today = todayLocal();

  return {
    mode: "DAY",
    day: today,
    month: today.slice(0, 7),
    startDate: today,
    endDate: today
  };
}

export function matchesDateFilter(record: Transaction, filter: DateFilter) {
  if (filter.mode === "DAY") return record.date === filter.day;
  if (filter.mode === "MONTH") return Boolean(filter.month) && record.date.startsWith(filter.month);
  if (!filter.startDate || !filter.endDate) return false;

  return record.date >= filter.startDate && record.date <= filter.endDate;
}

type Props = {
  value: DateFilter;
  onChange: (value: DateFilter) => void;
};

export function DateRangeFilter({ value, onChange }: Props) {
  function setField<K extends keyof DateFilter>(key: K, nextValue: DateFilter[K]) {
    onChange({ ...value, [key]: nextValue });
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-soft">
      <div className="space-y-2">
        <Label>Filter by</Label>
        <Select value={value.mode} onChange={(event) => setField("mode", event.target.value as FilterMode)}>
          <option value="DAY">Day</option>
          <option value="MONTH">Month</option>
          <option value="RANGE">Range</option>
        </Select>
      </div>

      {value.mode === "DAY" && (
        <div className="space-y-2">
          <Label>Day</Label>
          <Input type="date" value={value.day} onChange={(event) => setField("day", event.target.value)} />
        </div>
      )}

      {value.mode === "MONTH" && (
        <div className="space-y-2">
          <Label>Month</Label>
          <Input type="month" value={value.month} onChange={(event) => setField("month", event.target.value)} />
        </div>
      )}

      {value.mode === "RANGE" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Start</Label>
            <Input
              type="date"
              value={value.startDate}
              onChange={(event) => setField("startDate", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>End</Label>
            <Input
              type="date"
              value={value.endDate}
              onChange={(event) => setField("endDate", event.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
