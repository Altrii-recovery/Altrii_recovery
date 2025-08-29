import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import type Stripe from "stripe";

async function rawBody(req: NextRequest) {
  const buf = await req.arrayBuffer();
  return Buffer.from(buf);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return new NextResponse("Missing signature", { status: 400 });
  }

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
        const status = sub.status;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { stripeSubscriptionId: sub.id, planStatus: status },
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
        break;
    }

    return new NextResponse("ok", { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new NextResponse(`Handler error: ${msg}`, { status: 500 });
  }
}
