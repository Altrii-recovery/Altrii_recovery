import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const device = await prisma.device.findUnique({ where: { id: params.id } });
  if (!device) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
  });
  if (!user || user.id !== device.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: { supervised: true },
  });

  return NextResponse.json({ device: updated });
}
