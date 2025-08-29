import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { priceKey } = await req.json().catch(() => ({}));
  const envKey = String(priceKey || "").toUpperCase();
  const priceId = process.env[`STRIPE_PRICE_${envKey}` as const];
  if (!priceId) return NextResponse.json({ error: "invalid price" }, { status: 400 });

  let user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  if (!user.stripeCustomerId) {
    const customer = await stripe.customers.create({ email: user.email });
    user = await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  }

  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: user.stripeCustomerId!,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard`,
    cancel_url: `${origin}/subscription`,
  });

  return NextResponse.json({ url: checkout.url });
}
