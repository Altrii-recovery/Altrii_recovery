import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

async function rawBody(req: NextRequest) {
  const buf = await req.arrayBuffer();
  return Buffer.from(buf);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Missing signature", { status: 400 });
  }

  let event;
  try {
    const body = await rawBody(req);
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as any;
        const customerId = s.customer as string;
        const subId = s.subscription as string;
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { stripeSubscriptionId: subId, planStatus: "active" },
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as any;
        const status = sub.status as string;
        const customerId = sub.customer as string;
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { stripeSubscriptionId: sub.id, planStatus: status },
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const customerId = sub.customer as string;
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { planStatus: "canceled" },
        });
        break;
      }
      default:
        // ignore others
        break;
    }
    return new NextResponse("ok", { status: 200 });
  } catch (e: any) {
    return new NextResponse(`Handler error: ${e?.message || "unknown"}`, { status: 500 });
  }
}
