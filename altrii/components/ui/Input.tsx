"use client";
import { InputHTMLAttributes, forwardRef } from "react";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...rest }, ref) => (
    <input
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
Input.displayName = "Input";
