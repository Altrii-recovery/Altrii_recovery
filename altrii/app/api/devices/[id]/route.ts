import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type PatchBody = { name?: string };

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const name = (body.name ?? "").toString().trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  // ensure ownership
  const device = await prisma.device.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!device || device.user.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updated = await prisma.device.update({
    where: { id },
    data: { name },
  });

  return NextResponse.json({ device: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const device = await prisma.device.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!device || device.user.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Guard: don’t allow delete while locked
  if (device.lockUntil && device.lockUntil > new Date()) {
    return NextResponse.json({ error: "device is locked; unlock or wait until lock expires" }, { status: 409 });
  }

  await prisma.device.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
