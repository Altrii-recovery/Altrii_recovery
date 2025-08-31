import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildContentFilterMobileconfig } from "@/lib/profiles";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const device = await prisma.device.findUnique({
    where: { id: params.id },
    include: { user: true },
  });

  if (!device || device.user.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (device.user.planStatus !== "active") {
    return NextResponse.json({ error: "subscription inactive" }, { status: 402 });
  }

  const blockingRaw = (device.user.blockingSettings ?? {}) as Partial<{
    adult: boolean; social: boolean; gambling: boolean; customAllowedDomains: string[];
  }>;

  const profileBuf = buildContentFilterMobileconfig({
    userEmail: device.user.email,
    deviceName: device.name || "My iPhone",
    deviceId: device.id,
    blocking: {
      adult: blockingRaw.adult ?? true,
      social: blockingRaw.social ?? false,
      gambling: blockingRaw.gambling ?? false,
      customAllowedDomains: Array.isArray(blockingRaw.customAllowedDomains)
        ? blockingRaw.customAllowedDomains
        : [],
    },
  });

  const safeName = (device.name || "device").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const filename = `altrii-${safeName}-${device.id.slice(0,8)}.mobileconfig`;

  return new NextResponse(profileBuf, {
    status: 200,
    headers: {
      "Content-Type": "application/x-apple-aspen-config",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
