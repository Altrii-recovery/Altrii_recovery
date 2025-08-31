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

// Placeholder lists — replace with your curated sets later.
// Keep them small in dev so profiles stay readable while testing.
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

export function buildContentFilterMobileconfig(opts: {
  userEmail: string;
  deviceName: string;
  deviceId: string;
  blocking: BlockingSettings;
}) {
  const { userEmail, deviceName, deviceId, blocking } = opts;

  let deny: string[] = [];
  if (blocking.adult) deny = deny.concat(ADULT);
  if (blocking.social) deny = deny.concat(SOCIAL);
  if (blocking.gambling) deny = deny.concat(GAMBLING);

  const denyList = normalizeDomains(deny);
  const allowList = normalizeDomains(blocking.customAllowedDomains || []);

  // For iOS content filter, we’ll list both http:// and https:// variants.
  const denyXml = denyList
    .map((d) => `<string>http://${xml(d)}</string><string>https://${xml(d)}</string>`)
    .join("\n        ");
  const allowXml = allowList
    .map((d) => `<string>http://${xml(d)}</string><string>https://${xml(d)}</string>`)
    .join("\n        ");

  const payloadUUID = randomUUID();
  const filterUUID = randomUUID();

  const profile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadType</key> <string>Configuration</string>
  <key>PayloadVersion</key> <integer>1</integer>
  <key>PayloadIdentifier</key> <string>com.altrii.profile.${xml(deviceId)}</string>
  <key>PayloadUUID</key> <string>${xml(payloadUUID)}</string>
  <key>PayloadDisplayName</key> <string>Altrii Recovery – Safe Browsing</string>
  <key>PayloadDescription</key> <string>Profile for ${xml(deviceName)} (${xml(userEmail)}) generated ${xml(isoNow())}</string>
  <key>PayloadOrganization</key> <string>Altrii Recovery</string>
  <key>PayloadRemovalDisallowed</key> <false/>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadType</key> <string>com.apple.webcontent-filter</string>
      <key>PayloadVersion</key> <integer>1</integer>
      <key>PayloadIdentifier</key> <string>com.altrii.contentfilter.${xml(deviceId)}</string>
      <key>PayloadUUID</key> <string>${xml(filterUUID)}</string>
      <key>PayloadDisplayName</key> <string>Altrii Web Content Filter</string>

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

      <!-- We keep whitelist mode off so allowed domains override blocks but not restrict everything -->
      <key>WhitelistEnabled</key> <false/>
    </dict>
  </array>
</dict>
</plist>`;

  return Buffer.from(profile, "utf8");
}
