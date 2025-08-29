"use client";

import { useEffect, useState } from "react";

export function LockCountdown({ untilMs }: { untilMs: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!untilMs) return null;

  const diff = Math.max(0, untilMs - now);
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  parts.push(`${hours}h`, `${mins}m`, `${secs}s`);

  return (
    <span className="text-sm text-gray-700">
      • lock ends in {parts.join(" ")}
    </span>
  );
}
