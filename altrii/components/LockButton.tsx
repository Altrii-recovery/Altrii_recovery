"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LockButton({ deviceId }: { deviceId: string }) {
  const [hours, setHours] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();

  async function lock() {
    setErr("");
    setLoading(true);
    const res = await fetch(`/api/devices/${deviceId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || "Failed to set lock");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={720}
        value={hours}
        onChange={(e) => setHours(Number(e.target.value))}
        className="w-24 border rounded px-2 py-1"
        aria-label="Lock duration (hours)"
      />
      <button onClick={lock} className="rounded border px-3 py-1" disabled={loading}>
        {loading ? "Locking..." : "Lock"}
      </button>
      {err && <span className="text-red-600 text-sm">{err}</span>}
    </div>
  );
}
