import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const lower = String(email).toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: lower } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email: lower,
        passwordHash: hash,
        planStatus: "inactive",
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("sign-up error:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
