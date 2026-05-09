"use client";

import { useState } from "react";
import { BackupPanel } from "@/components/backup-panel";
import { BottomNav, type AppTab } from "@/components/bottom-nav";
import { DailyTotals } from "@/components/daily-totals";
import { createEmptyEncodeDraft, TransactionForm, type EncodeDraft } from "@/components/transaction-form";
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
  const [encodeDraft, setEncodeDraft] = useState<EncodeDraft>(() => createEmptyEncodeDraft());
  const [editingRecord, setEditingRecord] = useState<Transaction | null>(null);
  const [focusedRecordId, setFocusedRecordId] = useState<string | null>(null);

  function refresh(recordId?: string) {
    setRefreshKey((current) => current + 1);
    setEditingRecord(null);
    if (recordId) {
      setFocusedRecordId(recordId);
      setActiveTab("records");
    }
  }

  function editRecord(record: Transaction) {
    setEditingRecord(record);
    setFocusedRecordId(record.id);
    setActiveTab("encode");
  }

  function cancelEdit() {
    const recordId = editingRecord?.id ?? null;
    setEditingRecord(null);
    setFocusedRecordId(recordId);
    setActiveTab("records");
  }

  return (
    <main className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] text-foreground">
      <div className="mx-auto max-w-md px-4 pb-6 pt-[calc(env(safe-area-inset-top)+20px)]">
        <header className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">Money Changer</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal">{titles[activeTab]}</h1>
        </header>

        {activeTab === "encode" && (
          <TransactionForm
            draft={encodeDraft}
            onDraftChange={setEncodeDraft}
            editingRecord={editingRecord}
            onSaved={refresh}
            onCancelEdit={cancelEdit}
          />
        )}
        {activeTab === "records" && (
          <TransactionList
            refreshKey={refreshKey}
            onEdit={editRecord}
            highlightedRecordId={focusedRecordId}
            onHighlightedRecordConsumed={() => setFocusedRecordId(null)}
          />
        )}
        {activeTab === "totals" && <DailyTotals refreshKey={refreshKey} />}
        {activeTab === "backup" && <BackupPanel onChanged={refresh} />}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  );
}
