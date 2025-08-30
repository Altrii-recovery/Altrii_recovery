import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

function inferBaseUrl(req: NextRequest) {
  // Prefer NEXTAUTH_URL; fall back to request host
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

  // Ensure Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 500 });
  }

  const stripe = getStripe();

  // Load user
  const email = session.user.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // Ensure we have a Stripe customer
  if (!user.stripeCustomerId) {
    // create customer with email + user id metadata
    const customer = await stripe.customers.create({
      email,
      metadata: { appUserId: user.id },
    });
    user = await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });
  }

  // Build a safe return URL
  const returnUrl = `${inferBaseUrl(req)}/account`;

  // Create portal session
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId!,
      return_url: returnUrl,
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: `stripe portal error: ${msg}` }, { status: 500 });
  }
}
