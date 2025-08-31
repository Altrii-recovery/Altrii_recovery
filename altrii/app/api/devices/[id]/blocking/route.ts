import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type BlockingSettings = {
  adult: boolean;
  social: boolean;
  gambling: boolean;
  customAllowedDomains: string[];
};

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === "string");
}

function parseSettings(body: unknown): BlockingSettings | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const adult = typeof b.adult === "boolean" ? b.adult : null;
  const social = typeof b.social === "boolean" ? b.social : null;
  const gambling = typeof b.gambling === "boolean" ? b.gambling : null;
  const customAllowedDomains = isStringArray(b.customAllowedDomains) ? b.customAllowedDomains : null;

  if (adult === null || social === null || gambling === null || customAllowedDomains === null) {
    return null;
  }
  // normalize domains (lowercase, trim)
  const normalized = customAllowedDomains
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
  return { adult, social, gambling, customAllowedDomains: Array.from(new Set(normalized)) };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const device = await prisma.device.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!device) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ownerEmail = device.user?.email?.toLowerCase() ?? "";
  if (ownerEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const settings = (device.blockingSettings as BlockingSettings | null) ?? {
    adult: true,
    social: false,
    gambling: false,
    customAllowedDomains: [],
  };
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const device = await prisma.device.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!device) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ownerEmail = device.user?.email?.toLowerCase() ?? "";
  if (ownerEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = parseSettings(json);
  if (!parsed) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: { blockingSettings: parsed },
  });

  return NextResponse.json({ ok: true, deviceId: updated.id, settings: parsed });
}
