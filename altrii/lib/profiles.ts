import { randomUUID } from "crypto";

export type BlockingSettings = {
  adult: boolean;
  social: boolean;
  gambling: boolean;
  customAllowedDomains: string[];
};

function xml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isoNow() {
  return new Date().toISOString();
}

// --- Baseline domain lists (replace with your curated sets in production) ---
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
      d
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "")
    )
    .filter(Boolean);
  return Array.from(new Set(cleaned)).sort();
}

/**
 * Build a combined .mobileconfig with:
 * 1) Web Content Filter payload (BuiltIn) + ContentFilterUUID (required on unsupervised)
 * 2) DNS Settings payload that forces DNS-over-HTTPS to Cloudflare Family
 *
 * Cloudflare Family DoH endpoint blocks adult & malware by default:
 *   https://family.cloudflare-dns.com/dns-query
 */
export function buildContentFilterMobileconfig(opts: {
  userEmail: string;
  deviceName: string;
  deviceId: string;
  blocking: BlockingSettings;
}) {
  const { userEmail, deviceName, deviceId, blocking } = opts;

  // Collect block/allow lists
  let deny: string[] = [];
  if (blocking.adult) deny = deny.concat(ADULT);
  if (blocking.social) deny = deny.concat(SOCIAL);
  if (blocking.gambling) deny = deny.concat(GAMBLING);

  const denyList = normalizeDomains(deny);
  const allowList = normalizeDomains(blocking.customAllowedDomains || []);

  const denyXml = denyList
    .map((d) => `<string>http://${xml(d)}</string><string>https://${xml(d)}</string>`)
    .join("\n        ");
  const allowXml = allowList
    .map((d) => `<string>http://${xml(d)}</string><string>https://${xml(d)}</string>`)
    .join("\n        ");

  // UUIDs
  const profileUUID = randomUUID();              // Profile container UUID
  const wcfPayloadUUID = randomUUID();           // Web Content Filter payload UUID
  const contentFilterUUID = randomUUID();        // REQUIRED on unsupervised iOS/iPadOS
  const dnsPayloadUUID = randomUUID();           // DNS Settings payload UUID

  // Cloudflare Family DoH endpoint (adult/malware filtering)
  const CLOUDFLARE_FAMILY_DOH = "https://family.cloudflare-dns.com/dns-query";

  const profile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadType</key> <string>Configuration</string>
  <key>PayloadVersion</key> <integer>1</integer>
  <key>PayloadIdentifier</key> <string>com.altrii.profile.${xml(deviceId)}</string>
  <key>PayloadUUID</key> <string>${xml(profileUUID)}</string>
  <key>PayloadDisplayName</key> <string>Altrii – Safe Browsing (WCF + Encrypted DNS)</string>
  <key>PayloadDescription</key> <string>Profile for ${xml(deviceName)} (${xml(userEmail)}) generated ${xml(isoNow())}</string>
  <key>PayloadOrganization</key> <string>Altrii Recovery</string>
  <key>PayloadRemovalDisallowed</key> <false/>
  <key>PayloadContent</key>
  <array>
    <!-- Web Content Filter payload -->
    <dict>
      <key>PayloadType</key> <string>com.apple.webcontent-filter</string>
      <key>PayloadVersion</key> <integer>1</integer>
      <key>PayloadIdentifier</key> <string>com.altrii.contentfilter.${xml(deviceId)}</string>
      <key>PayloadUUID</key> <string>${xml(wcfPayloadUUID)}</string>
      <key>PayloadDisplayName</key> <string>Altrii Web Content Filter</string>

      <!-- REQUIRED on unsupervised iOS/iPadOS -->
      <key>ContentFilterUUID</key> <string>${xml(contentFilterUUID)}</string>

      <key>FilterType</key> <string>BuiltIn</string>
      <key>AutoFilterEnabled</key> <true/>
      <key>FilterBrowsers</key> <true/>
      <key>FilterSockets</key> <false/>
      <key>UserDefinedName</key> <string>Altrii Filter</string>

      <key>BlacklistedURLs</key>
      <array>
        ${denyXml}
      </array>

      <key>PermittedURLs</key>
      <array>
        ${allowXml}
      </array>

      <key>WhitelistEnabled</key> <false/>
    </dict>

    <!-- DNS Settings payload: force Cloudflare Family DoH -->
    <dict>
      <key>PayloadType</key> <string>com.apple.dnsSettings.managed</string>
      <key>PayloadVersion</key> <integer>1</integer>
      <key>PayloadIdentifier</key> <string>com.altrii.dns.${xml(deviceId)}</string>
      <key>PayloadUUID</key> <string>${xml(dnsPayloadUUID)}</string>
      <key>PayloadDisplayName</key> <string>Altrii Encrypted DNS</string>
      <key>PayloadDescription</key> <string>Enforces Cloudflare Family DNS-over-HTTPS for ${xml(deviceName)} (${xml(userEmail)})</string>

      <key>DNSSettings</key>
      <dict>
        <key>DNSProtocol</key> <string>HTTPS</string>
        <key>ServerURL</key> <string>${xml(CLOUDFLARE_FAMILY_DOH)}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;

  return Buffer.from(profile, "utf8");
}
