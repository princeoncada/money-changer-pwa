"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { todayLocal } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

export type DateFilter = {
  from: string;
  to: string;
};

export function defaultDateFilter(): DateFilter {
  const today = todayLocal();

  return {
    from: today,
    to: today
  };
}

export function matchesDateFilter(record: Transaction, filter: DateFilter) {
  if (filter.from && filter.to) return record.date >= filter.from && record.date <= filter.to;
  if (filter.from) return record.date === filter.from;
  if (filter.to) return record.date <= filter.to;

  return true;
}

type Props = {
  value: DateFilter;
  onChange: (value: DateFilter) => void;
};

export function DateRangeFilter({ value, onChange }: Props) {
  const selected = React.useMemo<DateRange | undefined>(
    () => ({
      from: parseDate(value.from),
      to: parseDate(value.to)
    }),
    [value.from, value.to]
  );

  const label = React.useMemo(() => {
    const from = parseDate(value.from);
    const to = parseDate(value.to);

    if (from && to) {
      if (value.from === value.to) return format(from, "MMM d, yyyy");
      return `${format(from, "MMM d, yyyy")} - ${format(to, "MMM d, yyyy")}`;
    }

    if (from) return format(from, "MMM d, yyyy");
    if (to) return `Until ${format(to, "MMM d, yyyy")}`;

    return "All dates";
  }, [value.from, value.to]);

  function handleSelect(range: DateRange | undefined) {
    onChange({
      from: formatDate(range?.from),
      to: formatDate(range?.to ?? range?.from)
    });
  }

  function setToday() {
    const today = todayLocal();
    onChange({ from: today, to: today });
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-soft">
      <div className="space-y-2">
        <Label>Date range</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-start bg-background text-left font-normal">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{label}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="z-[80] w-auto border border-border bg-white p-0 shadow-xl" align="start">
            <Calendar
              mode="range"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected?.from}
              numberOfMonths={1}
            />
            <div className="flex justify-end border-t border-border p-2">
              <Button type="button" variant="outline" size="sm" onClick={setToday}>
                Today
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function parseDate(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day);
}

function formatDate(date: Date | undefined) {
  if (!date) return "";

  return format(date, "yyyy-MM-dd");
}
