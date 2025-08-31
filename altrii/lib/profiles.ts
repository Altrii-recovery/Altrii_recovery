import { randomUUID } from "crypto";

function xml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build profile with:
 *  - Web Content Filter (BuiltIn) + ContentFilterUUID (required on unsupervised iOS)
 *  - DNS Settings (Cloudflare Family DNS-over-TLS) for fast, filtered DNS
 *
 * blockedDomains should contain full URL forms (e.g. http://example.com and https://example.com)
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
  const wcfPayloadUUID = randomUUID();
  const contentFilterUUID = randomUUID(); // ✅ required on unsupervised devices
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
  <key>PayloadDescription</key> <string>Content filtering and encrypted DNS for ${xml(deviceName)} (${xml(userEmail)})</string>
  <key>PayloadOrganization</key> <string>Altrii Recovery</string>

  <key>PayloadContent</key>
  <array>
    <!-- Web Content Filter payload -->
    <dict>
      <key>PayloadType</key> <string>com.apple.webcontent-filter</string>
      <key>PayloadVersion</key> <integer>1</integer>
      <key>PayloadIdentifier</key> <string>com.altrii.filter.${xml(deviceId)}</string>
      <key>PayloadUUID</key> <string>${xml(wcfPayloadUUID)}</string>
      <key>PayloadDisplayName</key> <string>Altrii Recovery Content Filter</string>

      <!-- ✅ Required on unsupervised devices -->
      <key>ContentFilterUUID</key> <string>${xml(contentFilterUUID)}</string>

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

    <!-- DNS Settings payload: Cloudflare Family DoT (fast + filtered) -->
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
