// app/api/auth/sign-up/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const lower = String(email).toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: lower } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email: lower,
        passwordHash,
        // set a safe initial value for blockingSettings
        blockingSettings: {
          adult: true,
          social: false,
          gambling: false,
          customAllowedDomains: [],
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
