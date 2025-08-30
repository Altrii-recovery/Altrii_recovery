import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_DAYS = 30; // 30 days

type LockBody = { days?: number };

function parseDays(json: unknown): number | null {
  const obj = (json ?? {}) as Record<string, unknown>;
  const val = obj["days"];
  if (typeof val !== "number") return null;
  if (!Number.isFinite(val)) return null;
  const int = Math.floor(val);
  if (int <= 0) return null;
  return int;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const days = parseDays(await request.json().catch(() => ({} as LockBody)));
  if (days === null) {
    return NextResponse.json({ error: "days (number) required" }, { status: 400 });
  }
  if (days > MAX_DAYS) {
    return NextResponse.json({ error: "max lock is 30 days" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, planStatus: true },
  });
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  if (user.planStatus !== "active") {
    return NextResponse.json({ error: "subscription required" }, { status: 402 });
  }

  const device = await prisma.device.findFirst({
    where: { id, userId: user.id },
    select: { id: true, lockUntil: true },
  });
  if (!device) {
    return NextResponse.json({ error: "device not found" }, { status: 404 });
  }

  const now = Date.now();
  const requestedUntil = new Date(now + days * 24 * 60 * 60 * 1000);

  if (device.lockUntil && device.lockUntil.getTime() > now) {
    if (requestedUntil.getTime() < device.lockUntil.getTime()) {
      return NextResponse.json(
        { error: "cannot shorten existing lock", currentLockUntil: device.lockUntil.toISOString() },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: { lockUntil: requestedUntil },
  });

  return NextResponse.json({ device: updated });
}
