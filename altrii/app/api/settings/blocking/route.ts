import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type Body = {
  adult?: boolean;
  social?: boolean;
  gambling?: boolean;
  customAllowedDomains?: string[];
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const clean = {
    adult: Boolean(body.adult ?? true),
    social: Boolean(body.social ?? false),
    gambling: Boolean(body.gambling ?? false),
    customAllowedDomains: Array.isArray(body.customAllowedDomains)
      ? body.customAllowedDomains
          .map((d) =>
            String(d)
              .trim()
              .toLowerCase()
              .replace(/^https?:\/\//, "")
              .replace(/\/+$/, "")
          )
          .filter(Boolean)
      : [],
  };

  const user = await prisma.user.update({
    where: { email: session.user.email.toLowerCase() },
    // ✅ Use Prisma.InputJsonValue instead of any
    data: { blockingSettings: clean as Prisma.InputJsonValue },
    select: { blockingSettings: true },
  });

  return NextResponse.json({ ok: true, blockingSettings: user.blockingSettings });
}
