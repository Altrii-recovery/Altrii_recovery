import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncUserSubscriptionByEmail } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const updated = await syncUserSubscriptionByEmail(session.user.email);
    if (!updated) return NextResponse.json({ error: "user not found" }, { status: 404 });
    return NextResponse.json({ ok: true, user: { plan: updated.plan, planStatus: updated.planStatus } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `refresh failed: ${msg}` }, { status: 500 });
  }
}
