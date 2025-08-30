// components/ui/Toaster.tsx
"use client";

import { useEffect, useState } from "react";

export type ToastKind = "success" | "error" | "info";
export type ToastItem = { id: string; kind: ToastKind; message: string };

let pushToastImpl: ((t: Omit<ToastItem, "id">) => void) | null = null;

/** Call from anywhere in client components: toast("Saved", "success") */
export function toast(message: string, kind: ToastKind = "info") {
  if (pushToastImpl) pushToastImpl({ message, kind });
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    pushToastImpl = ({ message, kind }: Omit<ToastItem, "id">) => {
      const id = crypto.randomUUID();
      const item = { id, message, kind };
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, 3500);
    };
    return () => {
      pushToastImpl = null;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end gap-2 p-4">
      {items.map((t) => (
        <div
          key={t.id}
          className={[
            "pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-md",
            t.kind === "success" ? "bg-green-50 border-green-300 text-green-900" :
            t.kind === "error"   ? "bg-red-50 border-red-300 text-red-900" :
                                   "bg-gray-50 border-gray-300 text-gray-900",
          ].join(" ")}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
