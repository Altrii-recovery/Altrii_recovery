import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

type PlanKey = "MONTH" | "THREE_MONTH" | "SIX_MONTH" | "YEAR";
type Body = { plan?: PlanKey };

function inferBaseUrl(req: NextRequest) {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/+$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const plan = body.plan;
  if (!plan) return NextResponse.json({ error: "plan required" }, { status: 400 });

  const envMap: Record<PlanKey, string | undefined> = {
    MONTH: process.env.STRIPE_PRICE_MONTH,
    THREE_MONTH: process.env.STRIPE_PRICE_3MONTH,
    SIX_MONTH: process.env.STRIPE_PRICE_6MONTH,
    YEAR: process.env.STRIPE_PRICE_YEAR,
  };
  const priceId = envMap[plan];
  if (!priceId || !priceId.startsWith("price_")) {
    return NextResponse.json(
      { error: "invalid price for plan; check STRIPE_PRICE_* env vars", plan, received: priceId ?? null },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 500 });
  }

  const stripe = getStripe();
  const base = inferBaseUrl(req);
  const email = session.user.email.toLowerCase();

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  if (!user.stripeCustomerId) {
    const customer = await stripe.customers.create({ email, metadata: { appUserId: user.id } });
    user = await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  }

  try {
    const sessionCk = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: user.stripeCustomerId!,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${base}/dashboard?status=success`,
      cancel_url: `${base}/subscription?status=cancelled`,
      metadata: { appUserId: user.id, plan },
    });

    // Browser redirect if form-posted, else JSON for fetch()
    const accepts = req.headers.get("accept") || "";
    const contentType = req.headers.get("content-type") || "";
    const isAjax = accepts.includes("application/json") || contentType.includes("application/json");
    if (!isAjax) return NextResponse.redirect(sessionCk.url!, { status: 303 });
    return NextResponse.json({ url: sessionCk.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: `stripe checkout error: ${msg}` }, { status: 500 });
  }
}
