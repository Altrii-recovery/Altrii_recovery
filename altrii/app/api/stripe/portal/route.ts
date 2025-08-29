import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() } });
  if (!user?.stripeCustomerId) return NextResponse.json({ error: "no customer" }, { status: 400 });

  const stripe = getStripe();
  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: portal.url });
}
