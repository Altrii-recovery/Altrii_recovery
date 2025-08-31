import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildContentFilterMobileconfig } from "@/lib/profiles";

// Minimal category lists (replace with your curated lists later)
const SOCIAL = [
  "instagram.com","www.instagram.com",
  "reddit.com","www.reddit.com",
  "x.com","twitter.com","www.twitter.com",
  "youtube.com","www.youtube.com","m.youtube.com","youtu.be",
];

const GAMBLING = [
  "bet365.com","www.bet365.com",
  "pokerstars.com","www.pokerstars.com",
  "williamhill.com","www.williamhill.com",
];

// Tiny adult sample — swap for a maintained list in production.
const ADULT = [
  "pornhub.com","www.pornhub.com",
  "xvideos.com","www.xvideos.com",
  "xnxx.com","www.xnxx.com",
];

function normalizeDomains(domains: string[]): string[] {
  const cleaned = domains
    .map((d) =>
      String(d)
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "")
    )
    .filter(Boolean);
  return Array.from(new Set(cleaned)).sort();
}

function expandToHttpHttps(domains: string[]): string[] {
  // WCF BlacklistedURLs works best when both schemes are present
  const out: string[] = [];
  for (const d of domains) {
    out.push(`http://${d}`, `https://${d}`);
  }
  return out;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const device = await prisma.device.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!device || device.user.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Optional subscription gate (leave commented if you want free downloads):
  // if (device.user.planStatus !== "active") {
  //   return NextResponse.json({ error: "subscription inactive" }, { status: 402 });
  // }

  const blockingRaw = (device.user.blockingSettings as any) || {};
  const adult = blockingRaw.adult ?? true;
  const social = blockingRaw.social ?? false;
  const gambling = blockingRaw.gambling ?? false;

  let deny: string[] = [];
  if (adult) deny = deny.concat(ADULT);
  if (social) deny = deny.concat(SOCIAL);
  if (gambling) deny = deny.concat(GAMBLING);

  const denyDomains = normalizeDomains(deny);
  const blockedDomains = expandToHttpHttps(denyDomains);

  const mobileconfig = buildContentFilterMobileconfig({
    deviceId: device.id,
    deviceName: device.name || "My iPhone",
    userEmail: device.user.email,
    blockedDomains,
  });

  // If buildContentFilterMobileconfig returns string, convert to Buffer
  const body = typeof mobileconfig === "string" ? Buffer.from(mobileconfig, "utf8") : mobileconfig;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/x-apple-aspen-config",
      "Content-Disposition": `attachment; filename="altrii-safe-${(device.name || "iphone").replace(/\s+/g, "-").toLowerCase()}.mobileconfig"`,
    },
  });
}
