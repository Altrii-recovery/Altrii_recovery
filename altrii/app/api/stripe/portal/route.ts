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
  const returnUrl = process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/account` : "http://localhost:3000/account";

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: portal.url });
}
