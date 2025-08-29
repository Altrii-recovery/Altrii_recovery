"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const data = await res.json();
      setErr(data.error || "Failed to sign up");
      return;
    }
    // After successful signup, go to sign-in page
    router.push("/sign-in");
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold mb-4">Create your account</h1>
      {err && <p className="text-red-600 mb-2">{err}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="you@example.com"
          className="w-full border rounded px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Create a password"
          className="w-full border rounded px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <button className="w-full rounded bg-black text-white py-2">
          Create account
        </button>
      </form>
      <p className="mt-3 text-sm">
        Already have an account?{" "}
        <a className="underline" href="/sign-in">
          Sign in
        </a>
      </p>
    </main>
  );
}
