"use client";

import { useEffect, useState } from "react";

type BlockingSettings = {
  adult: boolean;
  social: boolean;
  gambling: boolean;
  customAllowedDomains: string[];
};

async function getCurrentSettings(): Promise<BlockingSettings> {
  // We read them via a small API that returns the session user's blockingSettings.
  const res = await fetch("/api/me", { cache: "no-store" });
  if (!res.ok) throw new Error("failed to load settings");
  const data = await res.json();
  const s = (data?.user?.blockingSettings ?? {}) as Partial<BlockingSettings>;
  return {
    adult: s.adult ?? true,
    social: s.social ?? false,
    gambling: s.gambling ?? false,
    customAllowedDomains: Array.isArray(s.customAllowedDomains) ? s.customAllowedDomains : [],
  };
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [adult, setAdult] = useState(true);
  const [social, setSocial] = useState(false);
  const [gambling, setGambling] = useState(false);
  const [allowlistText, setAllowlistText] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const s = await getCurrentSettings();
        setAdult(s.adult);
        setSocial(s.social);
        setGambling(s.gambling);
        setAllowlistText(s.customAllowedDomains.join("\n"));
      } catch (e) {
        setMsg("Failed to load current settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    const domains = allowlistText
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);

    const res = await fetch("/api/settings/blocking", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        adult,
        social,
        gambling,
        customAllowedDomains: domains,
      }),
    });

    if (res.ok) {
      setMsg("Saved! Re-download your profile from the Dashboard to apply these changes.");
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(j?.error || "Failed to save settings");
    }
    setSaving(false);
  }

  if (loading) {
    return <main className="mx-auto max-w-3xl p-6">Loading…</main>;
    }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <a className="underline text-sm" href="/dashboard">Back to Dashboard</a>
      </div>

      <section className="rounded-lg border p-4 space-y-4">
        <h2 className="text-lg font-medium">Blocking</h2>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
          <span>Block adult content</span>
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={social} onChange={(e) => setSocial(e.target.checked)} />
          <span>Block social media (Instagram, Reddit, X/Twitter, YouTube)</span>
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={gambling} onChange={(e) => setGambling(e.target.checked)} />
          <span>Block gambling sites</span>
        </label>

        <div className="pt-2">
          <label className="block text-sm font-medium mb-1">Allowlist (one domain per line)</label>
          <textarea
            className="w-full h-40 rounded border px-3 py-2 text-sm font-mono"
            placeholder={"example.com\nnews.bbc.co.uk"}
            value={allowlistText}
            onChange={(e) => setAllowlistText(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">
            Domains only (no https://). Example: <code>example.com</code>
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {msg && <span className="text-sm">{msg}</span>}
        </div>

        <p className="text-xs text-gray-500">
          After saving, go to the Dashboard and click <b>Download profile</b> to install the updated filter.
        </p>
      </section>
    </main>
  );
}
