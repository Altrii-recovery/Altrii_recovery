// app/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import { Alert } from "@/components/ui/Alert";

type BlockingSettings = {
  adult: boolean;
  social: boolean;
  gambling: boolean;
  customAllowedDomains: string[];
};

type GetResp = { blocking: BlockingSettings } | { error: string };
type PutResp = { ok: true; blocking: BlockingSettings } | { error: string };

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
        if (res.ok && "blocking" in data) setB(data.blocking);
        else setMsg(("error" in data && data.error) || "Failed to load settings");
      } catch {
        setMsg("Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function parseDomains(text: string) {
    const raw = text.split(/[\n,\s]+/).map((s) => s.trim()).filter(Boolean);
    const cleaned = Array.from(new Set(raw.map((d) => d.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase())));
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
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Blocking Settings</h1>

      {msg && <Alert>{msg}</Alert>}

      <Card>
        <CardHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-center">
            <div className="flex items-center gap-3">
              <Switch checked={b.adult} onChange={(e) => setB((p) => ({ ...p, adult: e.currentTarget.checked }))} />
              <Label>Block adult content</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={b.social} onChange={(e) => setB((p) => ({ ...p, social: e.currentTarget.checked }))} />
              <Label>Block social media</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={b.gambling} onChange={(e) => setB((p) => ({ ...p, gambling: e.currentTarget.checked }))} />
              <Label>Block gambling</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="allowlist">Custom allowlist (one domain per line)</Label>
          <Textarea
            id="allowlist"
            className="min-h-[160px]"
            value={domainsText}
            onChange={(e) => parseDomains(e.target.value)}
            placeholder={"example.com\ndocs.myapp.com"}
          />
          <div className="pt-2">
            <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
