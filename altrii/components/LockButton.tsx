// components/LockButton.tsx
"use client";

import { useState } from "react";

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
  const [msg, setMsg] = useState<string>("");

  const locked =
    lockUntil ? new Date(lockUntil).getTime() > Date.now() : false;

  function parseJsonSafe(text: string): ApiOk | ApiErr | null {
    try {
      return JSON.parse(text) as ApiOk | ApiErr;
    } catch {
      return null;
    }
  }

  async function lockNow() {
    if (locked) return;

    setMsg("");
    const input = prompt("Lock device for how many days? (1–30)", "1");
    if (input == null) return;
    const days = Number.parseInt(input, 10);
    if (!Number.isFinite(days) || days < 1 || days > 30) {
      setMsg("Please enter a whole number between 1 and 30.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });

      const text = await res.text();
      const data = parseJsonSafe(text);

      if (!res.ok) {
        const detail =
          (data && (("error" in data && data.error) || ("detail" in data && data.detail))) ||
          text ||
          `status ${res.status}`;
        setMsg(String(detail));
        return;
      }

      // success — refresh so SSR state updates
      window.location.reload();
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={lockNow}
        disabled={loading || locked}
        className="rounded border px-3 py-1 disabled:opacity-60"
      >
        {locked ? "Locked" : loading ? "Locking…" : "Lock"}
      </button>
      {msg && <span className="text-sm text-red-600">{msg}</span>}
    </div>
  );
}
