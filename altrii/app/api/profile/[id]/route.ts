import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildMobileconfig, type BlockingSettings } from "@/lib/profiles";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, blockingSettings: true, planStatus: true },
  });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  if (user.planStatus !== "active") {
    return NextResponse.json({ error: "subscription required" }, { status: 402 });
  }

  const device = await prisma.device.findFirst({
    where: { id, userId: user.id },
    select: { id: true, name: true },
  });
  if (!device) return NextResponse.json({ error: "device not found" }, { status: 404 });

  const blocking = (user.blockingSettings as BlockingSettings | null) ?? {
    adult: true,
    social: false,
    gambling: false,
    customAllowedDomains: [],
  };

  const profile = buildMobileconfig({ deviceId: device.id, blocking });

  const blob = Buffer.from(JSON.stringify(profile, null, 2), "utf-8");
  const headers = new Headers({
    "Content-Type": "application/x-apple-aspen-config",
    "Content-Disposition": `attachment; filename="altrii-${device.name || "device"}.mobileconfig"`,
  });
  return new NextResponse(blob, { status: 200, headers });
}
