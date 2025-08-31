"use client";

import { useState } from "react";

export function DeviceActions(props: { id: string; name: string; lockUntilISO: string | null }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(props.name);
  const [busy, setBusy] = useState<string | null>(null);

  const locked = props.lockUntilISO ? new Date(props.lockUntilISO) > new Date() : false;

  async function saveName() {
    setBusy("save");
    const res = await fetch(`/api/devices/${props.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(null);
    if (res.ok) setEditing(false);
    else alert((await res.json().catch(() => ({}))).error || "Rename failed");
  }

  async function remove() {
    if (!confirm("Remove this device? (You can re-add it later)")) return;
    setBusy("delete");
    const res = await fetch(`/api/devices/${props.id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) {
      // quick reload to reflect removal
      window.location.reload();
    } else {
      alert((await res.json().catch(() => ({}))).error || "Delete failed");
    }
  }

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <input
            className="rounded border px-2 py-1 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
          <button
            onClick={saveName}
            disabled={busy === "save" || !name.trim()}
            className="rounded border px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === "save" ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => { setEditing(false); setName(props.name); }}
            className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => setEditing(true)}
            className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
          >
            Rename
          </button>
          <button
            onClick={remove}
            disabled={locked || busy === "delete"}
            className={`rounded border px-2 py-1 text-sm ${locked ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
            title={locked ? "Unlock or wait until lock expires to remove" : "Remove device"}
          >
            {busy === "delete" ? "Removing…" : "Remove"}
          </button>
        </>
      )}
    </div>
  );
}
