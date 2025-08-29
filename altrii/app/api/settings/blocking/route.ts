import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type BlockingSettings = {
  adult: boolean;
  social: boolean;
  gambling: boolean;
  customAllowedDomains: string[];
};

const DEFAULTS: BlockingSettings = {
  adult: true,
  social: false,
  gambling: false,
  customAllowedDomains: [],
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { blockingSettings: true },
  });
  const blocking = (user?.blockingSettings as BlockingSettings | null) ?? DEFAULTS;
  return NextResponse.json({ blocking });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const b = body?.blocking ?? {};

  const updated: BlockingSettings = {
    adult: typeof b.adult === "boolean" ? b.adult : DEFAULTS.adult,
    social: typeof b.social === "boolean" ? b.social : DEFAULTS.social,
    gambling: typeof b.gambling === "boolean" ? b.gambling : DEFAULTS.gambling,
    customAllowedDomains: Array.isArray(b.customAllowedDomains)
      ? b.customAllowedDomains
          .map((x: unknown) => (typeof x === "string" ? x.trim() : ""))
          .filter(Boolean)
      : DEFAULTS.customAllowedDomains,
  };

  await prisma.user.update({
    where: { email: session.user.email.toLowerCase() },
    data: { blockingSettings: updated },
  });

  return NextResponse.json({ ok: true, blocking: updated });
}
