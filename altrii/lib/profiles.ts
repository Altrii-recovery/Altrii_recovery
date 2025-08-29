export type BlockingSettings = {
  adult: boolean;
  social: boolean;
  gambling: boolean;
  customAllowedDomains: string[];
};

export function buildBlockedDomains(b: BlockingSettings): string[] {
  const baseAdult = [
    // (placeholder sample; you will maintain a real list server-side)
    "pornhub.com","xnxx.com","xvideos.com","redtube.com",
  ];
  const social = ["instagram.com","reddit.com","twitter.com","x.com","youtube.com","tiktok.com","facebook.com"];
  const gambling = ["bet365.com","williamhill.com","pokerstars.com","ladbrokes.com"];

  const out = new Set<string>();

  if (b.adult) baseAdult.forEach((d) => out.add(d));
  if (b.social) social.forEach((d) => out.add(d));
  if (b.gambling) gambling.forEach((d) => out.add(d));

  // Remove any domains explicitly allowed
  b.customAllowedDomains.forEach((allow) => out.delete(allow.toLowerCase()));

  return Array.from(out);
}

// Builds a minimal .mobileconfig payload (content filter focus)
export function buildMobileconfig({
  deviceId,
  blocking,
}: {
  deviceId: string;
  blocking: BlockingSettings;
}) {
  const blocked = buildBlockedDomains(blocking);

  const profile = {
    PayloadType: "Configuration",
    PayloadVersion: 1,
    PayloadIdentifier: `com.altriirecovery.content.${deviceId}`,
    PayloadUUID: crypto.randomUUID(),
    PayloadDisplayName: "Altrii Recovery Content Filter",
    PayloadDescription: "Blocks configured categories and domains",
    PayloadRemovalDisallowed: true,
    PayloadContent: [
      {
        PayloadType: "com.apple.webcontent-filter",
        PayloadIdentifier: `com.altriirecovery.webfilter.${deviceId}`,
        PayloadUUID: crypto.randomUUID(),
        PayloadDisplayName: "Altrii Filter",
        FilterType: "BuiltIn",
        AutoFilterEnabled: true,
        RestrictWebEnabled: true,
        BlacklistedURLs: blocked.map((d) => `http://${d}`).concat(blocked.map((d) => `https://${d}`)),
        WhitelistedURLs: (blocking.customAllowedDomains || []).map((d) => `https://${d}`),
      },
    ],
  };

  return profile;
}
