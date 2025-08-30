"use client";
import { ButtonHTMLAttributes } from "react";
export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={[
        "inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium",
        "bg-black text-white border-black hover:opacity-90 disabled:opacity-50",
        className,
      ].join(" ")}
    />
  );
}
