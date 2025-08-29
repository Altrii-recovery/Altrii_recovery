import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
  });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  if (!user.stripeCustomerId) {
    return NextResponse.json({ error: "no stripe customer on file" }, { status: 400 });
  }

  const stripe = getStripe();

  const subs = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "all",
    limit: 1,
  });

  const sub = subs.data[0];
  if (!sub) {
    await prisma.user.update({
      where: { id: user.id },
      data: { planStatus: "inactive", stripeSubscriptionId: null },
    });
    return NextResponse.json({ ok: true, status: "inactive" });
  }

  const priceId = sub.items.data[0]?.price?.id || "";

  const plan =
    priceId === process.env.STRIPE_PRICE_MONTH
      ? "MONTH"
      : priceId === process.env.STRIPE_PRICE_3MONTH
      ? "THREE_MONTH"
      : priceId === process.env.STRIPE_PRICE_6MONTH
      ? "SIX_MONTH"
      : priceId === process.env.STRIPE_PRICE_YEAR
      ? "YEAR"
      : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeSubscriptionId: sub.id,
      planStatus: sub.status,
      ...(plan ? { plan } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    status: sub.status,
    plan: plan || "unknown",
    priceId,
  });
}
