import { NextResponse } from "next/server";

export async function GET() {
  const keys = [
    "STRIPE_SECRET_KEY",
    "STRIPE_PRICE_MONTH",
    "STRIPE_PRICE_3MONTH",
    "STRIPE_PRICE_6MONTH",
    "STRIPE_PRICE_YEAR",
    "NEXTAUTH_URL",
  ] as const;

  const result = Object.fromEntries(
    keys.map((k) => [
      k,
      {
        present: Boolean(process.env[k]),
        sample:
          process.env[k]?.startsWith("price_")
            ? process.env[k]!.slice(0, 8) + "…"
            : (process.env[k] || "").slice(0, 4) + "…",
      },
    ])
  );

  return NextResponse.json(result);
}
