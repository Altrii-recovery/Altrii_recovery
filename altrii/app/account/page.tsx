// app/account/page.tsx
"use client";

import { useState } from "react";

export default function AccountPage() {
  // Change email
  const [newEmail, setNewEmail] = useState("");
  const [emailPwd, setEmailPwd] = useState("");
  const [emailMsg, setEmailMsg] = useState("");

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");

  const [busyPortal, setBusyPortal] = useState(false);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg("");
    try {
      const res = await fetch("/api/account/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, password: emailPwd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailMsg(data?.error || "Failed to change email");
        return;
      }
      setEmailMsg("Email updated ✓ — please sign out and sign back in.");
    } catch {
      setEmailMsg("Network error");
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg("");
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwdMsg(data?.error || "Failed to change password");
        return;
      }
      setPwdMsg("Password updated ✓");
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setPwdMsg("Network error");
    }
  }

  async function openPortal() {
    setBusyPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        alert(data?.error || "Failed to open billing portal");
        setBusyPortal(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      alert("Network error");
      setBusyPortal(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Account</h1>

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-medium">Change email</h2>
        <form onSubmit={submitEmail} className="space-y-3">
          <input
            type="email"
            required
            placeholder="New email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <input
            type="password"
            required
            placeholder="Current password"
            value={emailPwd}
            onChange={(e) => setEmailPwd(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <button className="rounded bg-black text-white px-4 py-2">Update email</button>
          {emailMsg && <p className="text-sm text-gray-700">{emailMsg}</p>}
        </form>
      </section>

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-medium">Change password</h2>
        <form onSubmit={submitPassword} className="space-y-3">
          <input
            type="password"
            required
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <input
            type="password"
            required
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            minLength={8}
          />
          <button className="rounded bg-black text-white px-4 py-2">Update password</button>
          {pwdMsg && <p className="text-sm text-gray-700">{pwdMsg}</p>}
        </form>
      </section>

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-medium">Subscription</h2>
        <p className="text-sm text-gray-600">
          Manage billing details, update card, cancel or change plan in Stripe.
        </p>
        <button
          onClick={openPortal}
          disabled={busyPortal}
          className="rounded border px-4 py-2 disabled:opacity-60"
        >
          {busyPortal ? "Opening…" : "Open billing portal"}
        </button>
      </section>
    </main>
  );
}
