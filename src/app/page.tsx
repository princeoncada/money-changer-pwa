"use client";

import { useState } from "react";
import { BackupPanel } from "@/components/backup-panel";
import { BottomNav, type AppTab } from "@/components/bottom-nav";
import { DailyTotals } from "@/components/daily-totals";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";
import type { Transaction } from "@/types/transaction";

const titles: Record<AppTab, string> = {
  encode: "Encode",
  records: "Records",
  totals: "Totals",
  backup: "Backup"
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>("encode");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingRecord, setEditingRecord] = useState<Transaction | null>(null);

  function refresh() {
    setRefreshKey((current) => current + 1);
    setEditingRecord(null);
  }

  function editRecord(record: Transaction) {
    setEditingRecord(record);
    setActiveTab("encode");
  }

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground">
      <div className="mx-auto max-w-md px-4 pb-6 pt-[calc(env(safe-area-inset-top)+20px)]">
        <header className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">Money Changer</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal">{titles[activeTab]}</h1>
        </header>

        {activeTab === "encode" && (
          <TransactionForm
            editingRecord={editingRecord}
            onSaved={refresh}
            onCancelEdit={() => setEditingRecord(null)}
          />
        )}
        {activeTab === "records" && <TransactionList refreshKey={refreshKey} onEdit={editRecord} />}
        {activeTab === "totals" && <DailyTotals refreshKey={refreshKey} />}
        {activeTab === "backup" && <BackupPanel onChanged={refresh} />}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  );
}
