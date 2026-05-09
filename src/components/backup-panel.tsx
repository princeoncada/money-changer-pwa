"use client";

import { Download, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
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
import { transactionRouter } from "@/lib/local-api/transactions";
import { todayLocal } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

export function BackupPanel({ onChanged }: { onChanged: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  async function exportJson() {
    const records = await transactionRouter.exportAll();
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `money-changer-backup-${todayLocal()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${records.length} records.`);
  }

  async function restoreJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const records = JSON.parse(text) as Transaction[];
    const restored = await transactionRouter.restoreAll(records);
    setMessage(`Restored ${restored} records.`);
    onChanged();
    event.target.value = "";
  }

  async function clearAll() {
    await transactionRouter.clearAll();
    setConfirmClear(false);
    setMessage("All records cleared from this phone.");
    onChanged();
  }

  return (
    <div className="space-y-4">
      <Alert variant="warning">Data is saved only on this phone. Export backups regularly.</Alert>

      {message && <Alert>{message}</Alert>}

      <Card className="border border-border bg-card shadow-sm">
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
    </div>
  );
}
