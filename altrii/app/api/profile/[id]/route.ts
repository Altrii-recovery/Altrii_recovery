import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { domainsFor, type BlockingSettings } from "@/lib/blocking";
import { mobileconfigXML } from "@/lib/profiles";

const DEFAULT_SETTINGS: BlockingSettings = {
  adult: true,
  social: false,
  gambling: false,
  customAllowedDomains: [],
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await context.params; // Next 15 passes params as a Promise

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
  });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const device = await prisma.device.findUnique({ where: { id } });
  if (!device || device.userId !== user.id) {
    return new NextResponse("Device not found", { status: 404 });
  }

  const raw = user.blockingSettings as unknown;
  const settings: BlockingSettings =
    raw && typeof raw === "object" ? (raw as BlockingSettings) : DEFAULT_SETTINGS;

  const blocked = domainsFor(settings);
  const allowed = Array.isArray(settings.customAllowedDomains)
    ? settings.customAllowedDomains
    : [];

  const xml = mobileconfigXML({
    deviceId: device.id,
    displayName: `Altrii – ${device.name}`,
    blockedDomains: blocked,
    allowedDomains: allowed,
  });

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/x-apple-aspen-config",
      "Content-Disposition": `attachment; filename="altrii-${device.id}.mobileconfig"`,
    },
  });
}
