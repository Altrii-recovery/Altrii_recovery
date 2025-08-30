import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { newEmail, password } = (await req.json().catch(() => ({}))) as {
    newEmail?: string;
    password?: string;
  };

  if (!newEmail || !password) {
    return NextResponse.json({ error: "newEmail and password required" }, { status: 400 });
  }

  const currentEmail = session.user.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: currentEmail } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "invalid password" }, { status: 400 });

  const lower = newEmail.toLowerCase();
  if (lower === currentEmail) {
    return NextResponse.json({ error: "email is unchanged" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email: lower } });
  if (exists) return NextResponse.json({ error: "email already in use" }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: { email: lower },
  });

  return NextResponse.json({ ok: true });
}
