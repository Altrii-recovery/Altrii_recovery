import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function isAjax(req: NextRequest) {
  const accepts = req.headers.get("accept") || "";
  const contentType = req.headers.get("content-type") || "";
  return accepts.includes("application/json") || contentType.includes("application/json");
}

function baseUrl(req: NextRequest) {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/+$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: { devices: true },
  });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  return NextResponse.json({ devices: user.devices });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: { devices: true },
  });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  if (user.planStatus !== "active") {
    if (!isAjax(req)) {
      return NextResponse.redirect(`${baseUrl(req)}/subscription`, { status: 303 });
    }
    return NextResponse.json({ error: "subscription inactive" }, { status: 402 });
  }

  if (user.devices.length >= 3) {
    if (!isAjax(req)) {
      return NextResponse.redirect(`${baseUrl(req)}/dashboard?error=max-devices`, { status: 303 });
    }
    return NextResponse.json({ error: "max 3 devices reached" }, { status: 403 });
  }

  // Support JSON and form posts
  let name = "";
  let platform = "ios";
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    name = String(body?.name ?? "");
    platform = String(body?.platform ?? "ios");
  } else {
    const fd = await req.formData();
    name = String(fd.get("name") ?? "");
    platform = String(fd.get("platform") ?? "ios");
  }

  name = name.trim();
  if (!name) {
    if (!isAjax(req)) {
      return NextResponse.redirect(`${baseUrl(req)}/dashboard?error=name-required`, { status: 303 });
    }
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const device = await prisma.device.create({
    data: {
      userId: user.id,
      name,
      platform,
    },
  });

  if (!isAjax(req)) {
    return NextResponse.redirect(`${baseUrl(req)}/dashboard?ok=device-added`, { status: 303 });
  }
  return NextResponse.json({ device });
}
