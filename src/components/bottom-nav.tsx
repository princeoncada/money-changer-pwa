"use client";

import { Archive, BarChart3, ListChecks, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppTab = "encode" | "records" | "totals" | "backup";

const tabs = [
  { value: "encode", label: "Encode", icon: PencilLine },
  { value: "records", label: "Records", icon: ListChecks },
  { value: "totals", label: "Totals", icon: BarChart3 },
  { value: "backup", label: "Backup", icon: Archive }
] satisfies { value: AppTab; label: string; icon: typeof PencilLine }[];

export function BottomNav({ activeTab, onTabChange }: { activeTab: AppTab; onTabChange: (tab: AppTab) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white px-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTabChange(tab.value)}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
