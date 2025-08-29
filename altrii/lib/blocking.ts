export type BlockingSettings = {
  adult: boolean;
  social: boolean;
  gambling: boolean;
  customAllowedDomains: string[];
};

export function domainsFor(settings: BlockingSettings): string[] {
  const adult = [
    "pornhub.com",
    "xvideos.com",
    "xnxx.com",
    "redtube.com",
    "xhamster.com",
  ];

  const social = [
    "instagram.com",
    "www.instagram.com",
    "reddit.com",
    "www.reddit.com",
    "twitter.com",
    "x.com",
    "www.twitter.com",
    "www.x.com",
    "youtube.com",
    "www.youtube.com",
    "t.co",
  ];

  const gambling = [
    "bet365.com",
    "williamhill.com",
    "skybet.com",
    "pokerstars.com",
    "888.com",
  ];

  let list: string[] = [];
  if (settings.adult) list = list.concat(adult);
  if (settings.social) list = list.concat(social);
  if (settings.gambling) list = list.concat(gambling);

  return Array.from(new Set(list));
}
