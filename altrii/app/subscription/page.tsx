// app/subscription/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";

type PlanKey = "MONTH" | "THREE_MONTH" | "SIX_MONTH" | "YEAR";
type PlanStatus = "active" | "inactive" | null;

type SubResp =
  | { plan: PlanKey | null; planStatus: PlanStatus }
  | { error: string };

const PRICES: Record<PlanKey, { label: string; priceText: string; priceIdEnv: string; blurb: string }> = {
  MONTH:       { label: "Monthly",     priceText: "£12 / month",          priceIdEnv: "STRIPE_PRICE_MONTH",    blurb: "Flexible monthly access." },
  THREE_MONTH: { label: "3 Months",    priceText: "£30 / 3 months",        priceIdEnv: "STRIPE_PRICE_3MONTH",  blurb: "Save vs. monthly." },
  SIX_MONTH:   { label: "6 Months",    priceText: "£50 / 6 months",        priceIdEnv: "STRIPE_PRICE_6MONTH",  blurb: "Best mid-term value." },
  YEAR:        { label: "Yearly",      priceText: "£90 / year",            priceIdEnv: "STRIPE_PRICE_YEAR",    blurb: "Max savings." },
};

function PlanCard({
  plan,
  currentPlan,
  planStatus,
  onSelect,
  disabled,
}: {
  plan: PlanKey;
  currentPlan: PlanKey | null;
  planStatus: PlanStatus;
  onSelect: (plan: PlanKey) => void;
  disabled: boolean;
}) {
  const { label, priceText, blurb } = PRICES[plan];
  const isCurrent = currentPlan === plan && planStatus === "active";

  return (
    <Card className={`transition ${isCurrent ? "border-black shadow" : ""}`}>
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-semibold">{label}</h3>
          {isCurrent && <span className="text-xs rounded bg-black text-white px-2 py-0.5">Current</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-2xl font-semibold">{priceText}</div>
        <p className="text-sm text-gray-600">{blurb}</p>
        <Button
          onClick={() => onSelect(plan)}
          disabled={disabled || isCurrent}
          className={`${isCurrent ? "opacity-60" : ""}`}
        >
          {isCurrent ? "Selected" : "Choose plan"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<PlanKey | null>(null);
  const [sub, setSub] = useState<{ plan: PlanKey | null; planStatus: PlanStatus }>({
    plan: null,
    planStatus: null,
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Your API should return { plan, planStatus }
        const res = await fetch("/api/subscription", { cache: "no-store" });
        const data: SubResp = await res.json();
        if (!res.ok || "error" in data) {
          setMsg(("error" in data && data.error) || "Failed to load subscription");
        } else {
          setSub(data);
        }
      } catch {
        setMsg("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subtitle = useMemo(() => {
    if (loading) return "Loading your subscription…";
    if (msg) return msg;
    const label = sub.plan ? PRICES[sub.plan].label : "No plan";
    const status = sub.planStatus ?? "inactive";
    return `Status: ${status} • Plan: ${label}`;
  }, [loading, msg, sub.plan, sub.planStatus]);

  async function checkout(plan: PlanKey) {
    setCheckingOut(plan);
    setMsg("");
    try {
      // Hit your existing checkout API — expects { priceId } and returns { url }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }), // server will map plan -> priceId (safer than exposing ids here)
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        const m = data?.error || "Checkout failed";
        setMsg(m);
        toast(m, "error");
        setCheckingOut(null);
        return;
      }
      // Redirect
      window.location.href = data.url;
    } catch {
      setMsg("Network error");
      toast("Network error", "error");
      setCheckingOut(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Choose your plan</h1>
        <a className="underline text-sm" href="/account">Account</a>
      </div>
      <p className="text-sm text-gray-700">{subtitle}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(PRICES) as PlanKey[]).map((plan) => (
          <PlanCard
            key={plan}
            plan={plan}
            currentPlan={sub.plan}
            planStatus={sub.planStatus}
            onSelect={checkout}
            disabled={checkingOut !== null}
          />
        ))}
      </div>

      <p className="text-xs text-gray-500">
        You can manage or cancel anytime in the{" "}
        <a className="underline" href="/account">billing portal</a>.
      </p>
    </main>
  );
}
