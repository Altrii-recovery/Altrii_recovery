import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ user: null });
  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { email: true, planStatus: true, blockingSettings: true },
  });
  return NextResponse.json({ user });
}
