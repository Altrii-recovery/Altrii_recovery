import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

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
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 500 });
  }

  const stripe = getStripe();
  const email = session.user.email.toLowerCase();

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  if (!user.stripeCustomerId) {
    const customer = await stripe.customers.create({ email, metadata: { appUserId: user.id } });
    user = await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });
  }

  const returnUrl = `${inferBaseUrl(req)}/account`;

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId!,
      return_url: returnUrl,
      ...(process.env.STRIPE_PORTAL_CONFIGURATION
        ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION }
        : {}),
    });

    // If this is a normal browser form/navigation, redirect to Stripe.
    const accepts = req.headers.get("accept") || "";
    const contentType = req.headers.get("content-type") || "";
    const isAjax = accepts.includes("application/json") || contentType.includes("application/json");

    if (!isAjax) {
      return NextResponse.redirect(portal.url, { status: 303 });
    }
    // Otherwise (fetch/XHR), return JSON for client-side redirect.
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: `stripe portal error: ${msg}` }, { status: 500 });
  }
}
