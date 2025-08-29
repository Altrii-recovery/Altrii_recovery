function xmlEscape(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function plistArray(items: string[]) {
  return items.map((i) => `<string>${xmlEscape(i)}</string>`).join("");
}

export function mobileconfigXML(opts: {
  deviceId: string;
  displayName: string;
  blockedDomains: string[];
  allowedDomains: string[];
}): string {
  const rootUUID = crypto.randomUUID();
  const filterUUID = crypto.randomUUID();

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadType</key><string>Configuration</string>
  <key>PayloadVersion</key><integer>1</integer>
  <key>PayloadIdentifier</key><string>com.altrii.profile.${xmlEscape(opts.deviceId)}</string>
  <key>PayloadUUID</key><string>${rootUUID}</string>
  <key>PayloadDisplayName</key><string>${xmlEscape(opts.displayName)}</string>
  <key>PayloadDescription</key><string>Altrii Recovery content filter</string>
  <key>PayloadRemovalDisallowed</key><true/>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadType</key><string>com.apple.webcontent-filter</string>
      <key>PayloadVersion</key><integer>1</integer>
      <key>PayloadIdentifier</key><string>com.altrii.profile.filter.${xmlEscape(opts.deviceId)}</string>
      <key>PayloadUUID</key><string>${filterUUID}</string>
      <key>PayloadDisplayName</key><string>Altrii Content Filter</string>

      <key>FilterType</key><string>BuiltIn</string>
      <key>AutoFilterEnabled</key><true/>
      <key>FilterBrowsers</key><true/>
      <key>FilterSockets</key><true/>
      <key>RestrictWebEnabled</key><true/>

      <key>BlacklistedURLs</key>
      <array>
        ${plistArray(opts.blockedDomains)}
      </array>

      <key>WhitelistedURLs</key>
      <array>
        ${plistArray(opts.allowedDomains || [])}
      </array>
    </dict>
  </array>
</dict>
</plist>`;
}
