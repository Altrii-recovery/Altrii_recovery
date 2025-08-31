"use client";

import { useState } from "react";

export function MarkSupervisedButton({ deviceId }: { deviceId: string }) {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onClick = async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch(`/api/devices/${deviceId}/mark-supervised`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setOk(true);
    } catch (e: any) {
      setErr(e.message || "Failed");
    } finally {
      setLoading(false);
      // Soft refresh so server component re-renders with updated DB state
      try { window.location.reload(); } catch {}
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={loading || ok}
      className={`rounded px-3 py-1 text-sm font-medium border ${
        ok
          ? "bg-green-600 text-white border-green-600"
          : "bg-primary text-primary-foreground border-primary hover:opacity-90"
      } disabled:opacity-60`}
      aria-busy={loading}
    >
      {ok ? "Marked ✓" : loading ? "Marking…" : "Mark as Supervised"}
    </button>
  );
}
