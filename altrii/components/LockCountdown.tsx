// components/LockCountdown.tsx
"use client";

import { useEffect, useState } from "react";

export function LockCountdown({ until }: { until: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const target = new Date(until).getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setRemaining("Unlocked");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      setRemaining(
        [days > 0 ? `${days}d` : "", hours > 0 ? `${hours}h` : "", `${minutes}m`]
          .filter(Boolean)
          .join(" ")
      );
    }

    update();
    const id = setInterval(update, 60_000); // update every minute
    return () => clearInterval(id);
  }, [until]);

  return (
    <span className="text-xs text-gray-500">
      Unlocks in {remaining}
    </span>
  );
}
