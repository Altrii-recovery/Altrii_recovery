import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

type PlanKey = "MONTH" | "THREE_MONTH" | "SIX_MONTH" | "YEAR";

/** Map Stripe prices to your internal Plan enum by env var. */
function planFromPriceId(priceId: string | null | undefined): PlanKey | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_MONTH) return "MONTH";
  if (priceId === process.env.STRIPE_PRICE_3MONTH) return "THREE_MONTH";
  if (priceId === process.env.STRIPE_PRICE_6MONTH) return "SIX_MONTH";
  if (priceId === process.env.STRIPE_PRICE_YEAR) return "YEAR";
  return null;
}

/** Query Stripe for the user's current subscription and update Prisma. Returns the updated user. */
export async function syncUserSubscriptionByEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;

  const stripe = getStripe();
  // Ensure customer exists; if not, user is definitely inactive
  if (!user.stripeCustomerId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { planStatus: "inactive", plan: "MONTH" },
    });
    return prisma.user.findUnique({ where: { id: user.id }, include: { devices: true } });
  }

  // Get active/latest subscription
  const subs = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "all",
    limit: 10,
    expand: ["data.items.data.price"],
  });

  // Find an active (or trialing) sub; otherwise the most recent canceled/ended one
  const preferred = subs.data.find((s) => s.status === "active" || s.status === "trialing")
    ?? subs.data.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];

  if (!preferred) {
    await prisma.user.update({
      where: { id: user.id },
      data: { planStatus: "inactive" },
    });
    return prisma.user.findUnique({ where: { id: user.id }, include: { devices: true } });
  }

  const price = preferred.items.data[0]?.price;
  const newPlan = planFromPriceId(typeof price === "string" ? undefined : price?.id) ?? user.plan ?? "MONTH";
  const newStatus = (preferred.status === "active" || preferred.status === "trialing") ? "active" : "inactive";

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: newPlan,
      planStatus: newStatus,
    },
  });

  return prisma.user.findUnique({ where: { id: user.id }, include: { devices: true } });
}
