import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params; // Next 15 passes params as a Promise

  const { hours } = (await req.json().catch(() => ({}))) as { hours?: number };
  const n = Number(hours);
  if (!Number.isFinite(n) || n <= 0) {
    return NextResponse.json({ error: "Invalid hours" }, { status: 400 });
  }

  // Max 30 days = 720 hours
  const clamped = Math.min(n, 720);
  const lockUntil = new Date(Date.now() + clamped * 60 * 60 * 1000);

  const device = await prisma.device.findUnique({ where: { id } });
  if (!device) return NextResponse.json({ error: "not found" }, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
  });
  if (!user || device.userId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const updated = await prisma.device.update({
    where: { id },
    data: { lockUntil },
  });

  return NextResponse.json({ device: updated });
}
