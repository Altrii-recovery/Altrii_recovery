import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Dev-only endpoint: sets plan to MONTH + active
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
  });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  await prisma.user.update({
    where: { id: user.id },
    data: { plan: "MONTH", planStatus: "active" },
  });

  return NextResponse.json({ ok: true });
}
