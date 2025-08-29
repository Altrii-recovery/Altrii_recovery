// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const priceKeyRaw = (body as Record<string, unknown>)?.priceKey;
    const envKey = String(priceKeyRaw || "").toUpperCase(); // MONTH | 3MONTH | 6MONTH | 6MONTH | YEAR
    const varName = `STRIPE_PRICE_${envKey}`;
    const priceId = process.env[varName as keyof NodeJS.ProcessEnv];

    if (!envKey || !priceId) {
      return NextResponse.json(
        {
          error: "invalid price",
          detail: !envKey
            ? "Missing body.priceKey (expected MONTH | 3MONTH | 6MONTH | YEAR)"
            : `Missing env ${varName}`,
          received: { priceKey: priceKeyRaw },
        },
        { status: 400 }
      );
    }

    const email = session.user.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }

    const stripe = getStripe();

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email });
      user = await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: user.stripeCustomerId!,
      line_items: [{ price: String(priceId), quantity: 1 }],
      success_url: `${origin}/dashboard`,
      cancel_url: `${origin}/subscription`,
    });

    return NextResponse.json({ url: checkout.url, using: varName });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("checkout error:", msg);
    return NextResponse.json({ error: "server", detail: msg }, { status: 500 });
  }
}
