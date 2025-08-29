"use client";

const plans = [
  { key: "MONTH", name: "Monthly", price: "£12" },
  { key: "3MONTH", name: "3 Months", price: "£30" },
  { key: "6MONTH", name: "6 Months", price: "£50" },
  { key: "YEAR", name: "Yearly", price: "£90" },
];

export default function SubscriptionPage() {
  async function checkout(key: string) {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceKey: key }),
    });
    const data = await res.json();
    if (data?.url) window.location.href = data.url;
    else alert("Failed to start checkout");
  }

  async function portal() {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data?.url) window.location.href = data.url;
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Subscription</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((p) => (
          <button
            key={p.key}
            onClick={() => checkout(p.key)}
            className="rounded border p-4 text-left hover:bg-gray-50"
          >
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-gray-600">{p.price} / cycle</div>
          </button>
        ))}
      </div>
      <div>
        <button onClick={portal} className="rounded bg-black text-white px-4 py-2">
          Manage Billing
        </button>
      </div>
      <p className="text-sm text-gray-600">
        Test mode: use Stripe test cards (e.g., 4242 4242 4242 4242).
      </p>
    </main>
  );
}
