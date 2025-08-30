import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

type PlanKey = "MONTH" | "THREE_MONTH" | "SIX_MONTH" | "YEAR";
type Body = { plan?: PlanKey };

function inferBaseUrl(req: NextRequest) {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Parse plan
  const body = (await req.json().catch(() => ({}))) as Body;
  const plan = body.plan;
  if (!plan) {
    return NextResponse.json({ error: "plan required" }, { status: 400 });
  }

  // Map plan -> env price id
  const envMap: Record<PlanKey, string | undefined> = {
    MONTH: process.env.STRIPE_PRICE_MONTH,
    THREE_MONTH: process.env.STRIPE_PRICE_3MONTH,
    SIX_MONTH: process.env.STRIPE_PRICE_6MONTH,
    YEAR: process.env.STRIPE_PRICE_YEAR,
  };

  const priceId = envMap[plan];
  if (!priceId || !priceId.startsWith("price_")) {
    return NextResponse.json(
      {
        error:
          "invalid price for plan; set the correct env var on Railway (STRIPE_PRICE_MONTH / _3MONTH / _6MONTH / _YEAR)",
        plan,
        received: priceId ?? null,
      },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 500 });
  }

  const stripe = getStripe();
  const base = inferBaseUrl(req);

  // Ensure a stripe customer exists
  const email = session.user.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  if (!user.stripeCustomerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { appUserId: user.id },
    });
    user = await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });
  }

  // Create checkout session
  try {
    const sessionCk = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: user.stripeCustomerId!,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/subscription?status=success`,
      cancel_url: `${base}/subscription?status=cancelled`,
      allow_promotion_codes: true,
      metadata: { appUserId: user.id, plan },
    });

    return NextResponse.json({ url: sessionCk.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: `stripe checkout error: ${msg}` }, { status: 500 });
  }
}
