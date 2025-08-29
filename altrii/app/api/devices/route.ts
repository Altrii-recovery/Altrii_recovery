import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: { devices: true },
  });
  return NextResponse.json({ devices: user?.devices ?? [] });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String((body as any).name || "").trim();
  const platform = String((body as any).platform || "ios");

  if (!name) {
    return NextResponse.json({ error: "device name required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: { devices: true },
  });
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  // Enforce active plan
  if (user.planStatus !== "active") {
    return NextResponse.json({ error: "subscription required" }, { status: 402 });
  }

  // Enforce max 3 devices
  const count = user.devices.length;
  if (count >= 3) {
    return NextResponse.json({ error: "device limit reached (3)" }, { status: 400 });
  }

  const device = await prisma.device.create({
    data: {
      userId: user.id,
      name,
      platform,
      profileInstalled: false,
    },
  });

  return NextResponse.json({ device });
}
