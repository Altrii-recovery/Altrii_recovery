import { randomUUID } from "crypto";

function xml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Build supervised content filter + DNS profile
 * Includes:
 *   - Web Content Filter payload
 *   - DNS Settings payload (Cloudflare Family DoT)
 */
export function buildContentFilterMobileconfig({
  deviceId,
  deviceName,
  userEmail,
  blockedDomains,
}: {
  deviceId: string;
  deviceName: string;
  userEmail: string;
  blockedDomains: string[];
}): string {
  const profileUUID = randomUUID();
  const filterPayloadUUID = randomUUID();
  const dnsPayloadUUID = randomUUID();

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadType</key> <string>Configuration</string>
  <key>PayloadVersion</key> <integer>1</integer>
  <key>PayloadIdentifier</key> <string>com.altrii.profile.${xml(deviceId)}</string>
  <key>PayloadUUID</key> <string>${xml(profileUUID)}</string>
  <key>PayloadDisplayName</key> <string>Altrii Recovery – Safe Browsing</string>
  <key>PayloadDescription</key> <string>Content filtering and DNS protection for ${xml(deviceName)} (${xml(userEmail)})</string>
  <key>PayloadOrganization</key> <string>Altrii Recovery</string>

  <key>PayloadContent</key>
  <array>
    <!-- Web Content Filter payload -->
    <dict>
      <key>PayloadType</key> <string>com.apple.webcontent-filter</string>
      <key>PayloadVersion</key> <integer>1</integer>
      <key>PayloadIdentifier</key> <string>com.altrii.filter.${xml(deviceId)}</string>
      <key>PayloadUUID</key> <string>${xml(filterPayloadUUID)}</string>
      <key>PayloadDisplayName</key> <string>Altrii Recovery Content Filter</string>
      <key>FilterType</key> <string>BuiltIn</string>
      <key>FilterBrowsers</key> <true/>
      <key>FilterSockets</key> <true/>
      <key>AutoFilterEnabled</key> <true/>
      <key>RestrictWebEnabled</key> <true/>
      <key>BlacklistedURLs</key>
      <array>
        ${blockedDomains.map((d) => `<string>${xml(d)}</string>`).join("\n        ")}
      </array>
    </dict>

    <!-- DNS Settings payload: Cloudflare Family DoT -->
    <dict>
      <key>PayloadType</key> <string>com.apple.dnsSettings.managed</string>
      <key>PayloadVersion</key> <integer>1</integer>
      <key>PayloadIdentifier</key> <string>com.altrii.dns.${xml(deviceId)}</string>
      <key>PayloadUUID</key> <string>${xml(dnsPayloadUUID)}</string>
      <key>PayloadDisplayName</key> <string>Altrii Encrypted DNS</string>
      <key>PayloadDescription</key> <string>Enforces Cloudflare Family DNS-over-TLS for ${xml(deviceName)} (${xml(userEmail)})</string>
      <key>DNSSettings</key>
      <dict>
        <key>DNSProtocol</key> <string>TLS</string>
        <key>ServerName</key> <string>family.cloudflare-dns.com</string>
        <key>ServerAddresses</key>
        <array>
          <string>1.1.1.3</string>
          <string>1.0.0.3</string>
        </array>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;
}
