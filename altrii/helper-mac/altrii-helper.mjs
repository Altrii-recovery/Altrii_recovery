import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";

function sh(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}\nExit ${r.status}\n${r.stderr}`);
  return r.stdout.trim();
}
const hasCfgutil = () => spawnSync("cfgutil", ["help"], { encoding: "utf8" }).status === 0;
const uuid = () => crypto.randomUUID();
const xml = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

function buildMobileconfig({ deviceId, deviceName, userEmail, blockedDomains }) {
  const profileUUID = uuid(), filterUUID = uuid(), contentFilterUUID = uuid(), dnsUUID = uuid(), restrUUID = uuid();
  const blocked = blockedDomains.map(d => `<string>${xml(d)}</string>`).join("\n        ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>PayloadType</key><string>Configuration</string>
  <key>PayloadVersion</key><integer>1</integer>
  <key>PayloadIdentifier</key><string>com.altrii.lock.${xml(deviceId)}</string>
  <key>PayloadUUID</key><string>${xml(profileUUID)}</string>
  <key>PayloadDisplayName</key><string>Altrii – Safe & Locked</string>
  <key>PayloadDescription</key><string>Non-removable filtering & restrictions for ${xml(deviceName)} (${xml(userEmail)})</string>
  <key>PayloadOrganization</key><string>Altrii Recovery</string>
  <key>PayloadRemovalDisallowed</key><true/>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadType</key><string>com.apple.webcontent-filter</string>
      <key>PayloadVersion</key><integer>1</integer>
      <key>PayloadIdentifier</key><string>com.altrii.filter.${xml(deviceId)}</string>
      <key>PayloadUUID</key><string>${xml(filterUUID)}</string>
      <key>PayloadDisplayName</key><string>Altrii Content Filter</string>
      <key>ContentFilterUUID</key><string>${xml(contentFilterUUID)}</string>
      <key>FilterType</key><string>BuiltIn</string>
      <key>FilterBrowsers</key><true/>
      <key>FilterSockets</key><true/>
      <key>AutoFilterEnabled</key><true/>
      <key>RestrictWebEnabled</key><true/>
      <key>BlacklistedURLs</key><array>
        ${blocked}
      </array>
    </dict>
    <dict>
      <key>PayloadType</key><string>com.apple.dnsSettings.managed</string>
      <key>PayloadVersion</key><integer>1</integer>
      <key>PayloadIdentifier</key><string>com.altrii.dns.${xml(deviceId)}</string>
      <key>PayloadUUID</key><string>${xml(dnsUUID)}</string>
      <key>PayloadDisplayName</key><string>Altrii Encrypted DNS</string>
      <key>PayloadDescription</key><string>Cloudflare Family over TLS</string>
      <key>DNSSettings</key><dict>
        <key>DNSProtocol</key><string>TLS</string>
        <key>ServerName</key><string>family.cloudflare-dns.com</string>
        <key>ServerAddresses</key><array><string>1.1.1.3</string><string>1.0.0.3</string></array>
      </dict>
    </dict>
    <dict>
      <key>PayloadType</key><string>com.apple.applicationaccess</string>
      <key>PayloadVersion</key><integer>1</integer>
      <key>PayloadIdentifier</key><string>com.altrii.restrictions.${xml(deviceId)}</string>
      <key>PayloadUUID</key><string>${xml(restrUUID)}</string>
      <key>PayloadDisplayName</key><string>Altrii Restrictions</string>
      <key>allowEraseContentAndSettings</key><false/>
      <key>allowUIConfigurationProfileInstallation</key><false/>
      <key>allowAppInstallation</key><false/>
    </dict>
  </array>
</dict></plist>`;
}

function expandHttpHttps(domains) {
  const out = [];
  for (const d of domains) {
    const clean = String(d).trim().replace(/^https?:\/\//,"").replace(/\/+$/,"");
    if (!clean) continue;
    out.push(`http://${clean}`, `https://${clean}`);
  }
  return Array.from(new Set(out));
}

function pickDeviceUDID() {
  const out = sh("cfgutil", ["--format", "JSON", "list"]);
  const json = JSON.parse(out);
  const list = json?.Output || [];
  if (!Array.isArray(list) || list.length === 0) throw new Error("No iOS devices detected. Plug in and 'Trust This Computer'.");
  const first = list[0];
  return { udid: first.UDID, name: first.DeviceName || "iPhone" };
}

function superviseDevice(udid) {
  const args = ["prepare","--supervised","--erase","--skip-setup-panes","AppleID,Biometric,Diagnostics,DisplayTone,Location,Privacy,Restore,ScreenTime,Siri,Zoom","--udid", udid];
  console.log("• Supervising device (this will erase it)...");
  sh("cfgutil", args);
  console.log("✓ Device supervised.");
}
function installProfile(udid, path) {
  console.log("• Installing non-removable Altrii profile...");
  sh("cfgutil", ["install-profile", path, "--udid", udid]);
  console.log("✓ Profile installed.");
}

(async () => {
  try {
    if (!hasCfgutil()) {
      console.error("cfgutil not found. Install Apple Configurator 2 (Mac App Store), then re-run.");
      process.exit(2);
    }
    console.log("Detecting connected iPhone…");
    const { udid, name } = pickDeviceUDID();
    console.log(`Found: ${name} (${udid})`);

    console.log("\n*** This will ERASE the device to enable supervision. Back up first. ***");
    console.log("Press Enter to continue or Ctrl+C to cancel.");
    try { execFileSync("/bin/bash", ["-lc", "read -r _ < /dev/tty"]); } catch {}

    superviseDevice(udid);

    // sample lists (later we pull from your API)
    const ADULT = ["pornhub.com","xvideos.com","xnxx.com"];
    const SOCIAL = ["instagram.com","reddit.com","x.com","twitter.com","youtube.com","youtu.be"];
    const GAMBLING = ["bet365.com","pokerstars.com","williamhill.com"];
    const blockedDomains = expandHttpHttps([...ADULT, ...SOCIAL, ...GAMBLING]);

    const tmp = mkdtempSync(join(tmpdir(), "altrii-"));
    const path = join(tmp, "altrii-locked.mobileconfig");
    const profile = buildMobileconfig({ deviceId: udid, deviceName: name, userEmail: "user@altrii.example", blockedDomains });
    writeFileSync(path, profile, "utf8");

    installProfile(udid, path);

    console.log("\n✅ Done. Device is supervised; profile is non-removable; 'Erase' in Settings is disabled.");
    console.log("When the timer expires, we’ll provide a small unlock helper.");
  } catch (e) {
    console.error("\nERROR:", e.message || e);
    process.exit(1);
  }
})();
