import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      include: { devices: true },
    });

    return NextResponse.json({ devices: user?.devices ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "server error (GET)";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as unknown;
    const name = String((body as { name?: string })?.name || "").trim();

    if (name.length < 2) {
      return NextResponse.json({ error: "Device name too short" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      include: { devices: true },
    });
    if (!user) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }

    if ((user.devices?.length || 0) >= 3) {
      return NextResponse.json({ error: "Device limit reached (3)" }, { status: 403 });
    }

    const device = await prisma.device.create({
      data: { userId: user.id, name },
    });

    return NextResponse.json({ device });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "server error (POST)";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
