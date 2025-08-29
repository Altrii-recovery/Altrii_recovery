"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddDeviceForm() {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || "Failed to add device");
      return;
    }
    setName("");
    router.refresh(); // refresh server components to show new device
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2 mt-3">
      <input
        className="border rounded px-3 py-2 flex-1"
        placeholder="Device name (e.g., My iPhone)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        minLength={2}
      />
      <button
        className="rounded bg-black text-white px-3 py-2"
        disabled={loading}
      >
        {loading ? "Adding..." : "Add device"}
      </button>
      {err && <div className="text-red-600 text-sm ml-2">{err}</div>}
    </form>
  );
}
