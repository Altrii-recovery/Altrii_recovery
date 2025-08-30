// components/ui/Modal.tsx
"use client";

import { ReactNode, useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal role="dialog">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border bg-white shadow-lg">
        <div className="border-b px-4 py-3 text-base font-semibold">{title ?? "Modal"}</div>
        <div className="px-4 py-3">{children}</div>
        {footer && <div className="border-t px-4 py-3 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
