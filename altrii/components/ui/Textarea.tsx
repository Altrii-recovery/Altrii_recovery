"use client";
import { TextareaHTMLAttributes, forwardRef } from "react";
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...rest }, ref) => (
    <textarea
      ref={ref}
      className={[
        "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-black/10",
        className,
      ].join(" ")}
      {...rest}
    />
  )
);
Textarea.displayName = "Textarea";
