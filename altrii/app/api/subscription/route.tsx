// app/subscription/page.tsx
"use client";

import { useState } from "react";

const PLANS = [
  { key: "MONTH", label: "Monthly", price: "£12" },
  { key: "3MONTH", label: "3 Months", price: "£30" },
  { key: "6MONTH", label: "6 Months", price: "£50" },
  { key: "YEAR", label: "Yearly", price: "£90" },
] as const;

export default function SubscriptionPage() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");

  function safeParseJSON(text: string) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async function startCheckout(priceKey: string) {
    setMsg("");
    setLoadingKey(priceKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey }),
      });

      const text = await res.text();
      const data = safeParseJSON(text);

      if (!res.ok) {
        const detail =
          (data && (data.detail || data.error)) ||
          text ||
          `status ${res.status}`;
        setMsg(`Checkout failed: ${detail}`);
        return;
      }

      const url = data?.url;
      if (url) {
        window.location.href = url;
        return;
      }

      setMsg("Checkout failed: missing redirect URL.");
    } catch (e) {
      setMsg("Network error starting checkout.");
    } finally {
      setLoadingKey(null);
    }
  }

  async function openPortal() {
    setMsg("");
    setLoadingKey("PORTAL");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const text = await res.text();
      const data = safeParseJSON(text);

      if (!res.ok) {
        const detail =
          (data && (data.detail || data.error)) ||
          text ||
          `status ${res.status}`;
        setMsg(`Billing portal error: ${detail}`);
        return;
      }

      const url = data?.url;
      if (url) {
        window.location.href = url;
        return;
      }

      setMsg("Billing portal error: missing redirect URL.");
    } catch {
      setMsg("Network error opening portal.");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Subscription</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        {PLANS.map((p) => (
          <button
            key={p.key}
            onClick={() => startCheckout(p.key)}
            disabled={loadingKey !== null}
            className="rounded border p-4 text-left hover:bg-gray-50 disabled:opacity-60"
          >
            <div className="font-medium">{p.label}</div>
            <div className="text-sm text-gray-600">{p.price} / cycle</div>
            {loadingKey === p.key && (
              <div className="mt-2 text-xs text-gray-500">Creating checkout…</div>
            )}
          </button>
        ))}
      </div>

      <div>
        <button
          onClick={openPortal}
          disabled={loadingKey !== null}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-60"
        >
          Manage Billing
        </button>
        {loadingKey === "PORTAL" && (
          <span className="ml-2 text-xs text-gray-500">Opening portal…</span>
        )}
      </div>

      {msg && <p className="text-sm text-red-600">{msg}</p>}

      <p className="text-sm text-gray-600">
        Test mode: use Stripe test cards (e.g., <code>4242 4242 4242 4242</code>).
      </p>
    </main>
  );
}
