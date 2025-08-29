"use client";

import { useState } from "react";

export function RefreshSubscriptionButton() {
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function refreshNow() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/stripe/refresh", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error || "Failed to refresh");
      } else {
        setMsg(`Status: ${data?.status ?? "unknown"} — Plan: ${data?.plan ?? "unknown"}`);
        // Reload to reflect updated server-rendered state
        setTimeout(() => window.location.reload(), 500);
      }
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={refreshNow}
        disabled={loading}
        className="rounded border px-3 py-1"
      >
        {loading ? "Refreshing…" : "Refresh from Stripe"}
      </button>
      {msg && <p className="mt-2 text-sm text-gray-600">{msg}</p>}
    </div>
  );
}
