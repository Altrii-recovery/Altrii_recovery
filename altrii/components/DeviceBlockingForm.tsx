"use client";

import { useEffect, useState } from "react";

type BlockingSettings = {
  adult: boolean;
  social: boolean;
  gambling: boolean;
  customAllowedDomains: string[];
};

function parseDomains(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
}

export function DeviceBlockingForm({ deviceId, initial }: { deviceId: string; initial?: BlockingSettings | null }) {
  const [settings, setSettings] = useState<BlockingSettings>(
    initial ?? { adult: true, social: false, gambling: false, customAllowedDomains: [] }
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domainsText, setDomainsText] = useState((initial?.customAllowedDomains ?? []).join("\n"));

  // If initial changes (hot reload), update state
  useEffect(() => {
    if (initial) {
      setSettings(initial);
      setDomainsText(initial.customAllowedDomains.join("\n"));
    }
  }, [initial]);

  const save = async () => {
    try {
      setLoading(true);
      setSaved(false);
      setError(null);
      const res = await fetch(`/api/devices/${deviceId}/blocking`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adult: settings.adult,
          social: settings.social,
          gambling: settings.gambling,
          customAllowedDomains: parseDomains(domainsText),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setSaved(true);
      // Optional: reload to reflect in any server components
      setTimeout(() => {
        try { window.location.reload(); } catch {}
      }, 600);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key: keyof Omit<BlockingSettings, "customAllowedDomains">) => {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  };

  return (
    <div className="rounded border p-3 text-sm space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.adult} onChange={() => toggle("adult")} />
          <span>Block adult content</span>
        </label>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.social} onChange={() => toggle("social")} />
          <span>Block social media</span>
        </label>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.gambling} onChange={() => toggle("gambling")} />
          <span>Block gambling</span>
        </label>
      </div>
      <div>
        <label className="mb-1 block font-medium">Allowed domains (one per line)</label>
        <textarea
          className="w-full rounded border p-2 font-mono"
          rows={4}
          placeholder="example.com"
          value={domainsText}
          onChange={(e) => setDomainsText(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={loading}
          className="rounded bg-primary px-3 py-1.5 text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-green-600">Saved ✓</span>}
        {error && <span className="text-red-600">Error: {error}</span>}
      </div>
    </div>
  );
}
