import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

async function rawBody(req: NextRequest) {
  const buf = await req.arrayBuffer();
  return Buffer.from(buf);
}

function priceIdToPlan(priceId: string | null | undefined) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_MONTH) return "MONTH";
  if (priceId === process.env.STRIPE_PRICE_3MONTH) return "THREE_MONTH";
  if (priceId === process.env.STRIPE_PRICE_6MONTH) return "SIX_MONTH";
  if (priceId === process.env.STRIPE_PRICE_YEAR) return "YEAR";
  return null;
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new NextResponse("Missing signature", { status: 400 });

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    const body = await rawBody(req);
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid payload";
    return new NextResponse(`Webhook Error: ${msg}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const customerId = (s.customer ?? "") as string;
        const subId = (s.subscription ?? "") as string;
        if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { stripeSubscriptionId: subId || null, planStatus: "active" },
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const status = sub.status; // 'active' | 'trialing' | 'past_due' | etc.
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        const priceId = sub.items.data[0]?.price?.id || null;
        const plan = priceIdToPlan(priceId);

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: sub.id,
            planStatus: status,
            ...(plan ? { plan } : {}),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { planStatus: "canceled" },
        });
        break;
      }

      default:
        // ignore other events
        break;
    }

    // Respond quickly so Stripe stops retrying
    return new NextResponse("ok", { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("Webhook handler error:", msg);
    // Still return 200 to avoid endless retries for non-critical errors
    return new NextResponse("ok", { status: 200 });
  }
}
