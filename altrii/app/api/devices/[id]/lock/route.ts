import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_MINUTES = 30 * 24 * 60; // 30 days

type LockBody = {
  minutes?: number;
};

function parseMinutes(json: unknown): number | null {
  const obj = (json ?? {}) as Record<string, unknown>;
  const val = obj["minutes"];
  if (typeof val !== "number") return null;
  if (!Number.isFinite(val)) return null;
  const int = Math.floor(val);
  if (int <= 0) return null;
  return int;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const minutes = parseMinutes(await req.json().catch(() => ({} as LockBody)));
  if (minutes === null) {
    return NextResponse.json({ error: "minutes (number) required" }, { status: 400 });
  }
  if (minutes > MAX_MINUTES) {
    return NextResponse.json({ error: "max lock is 30 days" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, planStatus: true },
  });
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  // Require active subscription to lock
  if (user.planStatus !== "active") {
    return NextResponse.json({ error: "subscription required" }, { status: 402 });
  }

  const device = await prisma.device.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, lockUntil: true, name: true, platform: true, profileInstalled: true },
  });
  if (!device) {
    return NextResponse.json({ error: "device not found" }, { status: 404 });
  }

  const now = Date.now();
  const requestedUntil = new Date(now + minutes * 60_000);

  // Do not allow shortening an existing active lock
  if (device.lockUntil && device.lockUntil.getTime() > now) {
    if (requestedUntil.getTime() < device.lockUntil.getTime()) {
      return NextResponse.json(
        {
          error: "cannot shorten existing lock",
          currentLockUntil: device.lockUntil.toISOString(),
        },
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
