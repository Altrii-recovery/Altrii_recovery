// app/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BlockingSettings = {
  adult: boolean;
  social: boolean;
  gambling: boolean;
  customAllowedDomains: string[];
};

type GetResp =
  | { blocking: BlockingSettings }
  | { error: string };

type PutResp =
  | { ok: true; blocking: BlockingSettings }
  | { error: string };

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [b, setB] = useState<BlockingSettings>({
    adult: true,
    social: false,
    gambling: false,
    customAllowedDomains: [],
  });

  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/blocking");
        const data: GetResp = await res.json();
        if (res.ok && "blocking" in data) {
          setB(data.blocking);
        } else {
          setMsg(("error" in data && data.error) || "Failed to load settings");
        }
      } catch {
        setMsg("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function parseDomains(text: string) {
    const raw = text
      .split(/[\n,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const cleaned = Array.from(
      new Set(
        raw.map((d) =>
          d.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase()
        )
      )
    );
    setB((prev) => ({ ...prev, customAllowedDomains: cleaned }));
  }

  async function onSave() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings/blocking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocking: b }),
      });
      const data: PutResp = await res.json();
      if (!res.ok || ("error" in data && data.error)) {
        setMsg(("error" in data && data.error) || "Failed to save");
        return;
      }
      setMsg("Saved ✓");
      router.refresh();
    } catch {
      setMsg("Network error");
    } finally {
      setSaving(false);
    }
  }

  const domainsText = b.customAllowedDomains.join("\n");

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Blocking Settings</h1>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <section className="rounded border p-4 space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={b.adult}
                onChange={() => setB((p) => ({ ...p, adult: !p.adult }))}
              />
              <span className="font-medium">Block adult content</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={b.social}
                onChange={() => setB((p) => ({ ...p, social: !p.social }))}
              />
              <span className="font-medium">
                Block social media (Instagram, Reddit, X/Twitter, YouTube)
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={b.gambling}
                onChange={() => setB((p) => ({ ...p, gambling: !p.gambling }))}
              />
              <span className="font-medium">Block gambling</span>
            </label>
          </section>

          <section className="rounded border p-4">
            <h2 className="text-lg font-medium mb-2">Custom allowlist (optional)</h2>
            <p className="text-sm text-gray-600 mb-2">
              One domain per line (e.g. <code>example.com</code>). These domains are
              allowed even if a category is blocked.
            </p>
            <textarea
              className="w-full min-h-[160px] border rounded p-2"
              value={domainsText}
              onChange={(e) => parseDomains(e.target.value)}
              placeholder={"example.com\ndocs.myapp.com"}
            />
          </section>

          <div className="flex items-center gap-3">
            <button
              onClick={onSave}
              disabled={saving}
              className="rounded bg-black text-white px-4 py-2 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
            {msg && <span className="text-sm text-gray-700">{msg}</span>}
          </div>
        </>
      )}
    </main>
  );
}
