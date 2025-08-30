// components/LockButton.tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toaster";

type ApiOk = { device?: { id: string } };
type ApiErr = { error?: string; detail?: string };

export function LockButton({
  deviceId,
  lockUntil,
}: {
  deviceId: string;
  lockUntil: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<string>("1");
  const [msg, setMsg] = useState<string>("");

  const locked = lockUntil ? new Date(lockUntil).getTime() > Date.now() : false;

  function parseJsonSafe(text: string): ApiOk | ApiErr | null {
    try {
      return JSON.parse(text) as ApiOk | ApiErr;
    } catch {
      return null;
    }
  }

  async function submitLock() {
    setMsg("");
    const n = Number.parseInt(days, 10);
    if (!Number.isFinite(n) || n < 1 || n > 30) {
      setMsg("Enter a whole number between 1 and 30.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: n }),
      });

      const text = await res.text();
      const data = parseJsonSafe(text);

      if (!res.ok) {
        const detail =
          (data && (("error" in data && data.error) || ("detail" in data && data.detail))) ||
          text ||
          `status ${res.status}`;
        setMsg(String(detail));
        toast("Failed to lock device", "error");
        return;
      }

      toast(`Device locked for ${n} day${n === 1 ? "" : "s"}`, "success");
      setOpen(false);
      window.location.reload();
    } catch {
      setMsg("Network error");
      toast("Network error", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => setOpen(true)}
        disabled={loading || locked}
        className="rounded border px-3 py-1 disabled:opacity-60"
      >
        {locked ? "Locked" : loading ? "Locking…" : "Lock"}
      </button>

      <Modal
        open={open}
        onClose={() => (loading ? null : setOpen(false))}
        title="Lock device"
        footer={
          <>
            <Button onClick={() => setOpen(false)} disabled={loading} className="bg-white text-black border-gray-300">
              Cancel
            </Button>
            <Button onClick={submitLock} disabled={loading}>
              {loading ? "Locking…" : "Confirm lock"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Days to lock (1–30)</label>
          <Input
            type="number"
            min={1}
            max={30}
            inputMode="numeric"
            pattern="[0-9]*"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
      </Modal>
    </div>
  );
}
