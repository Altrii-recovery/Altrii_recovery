"use client";
import { ButtonHTMLAttributes } from "react";
export function GhostButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={[
        "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium",
        "border border-gray-300 hover:bg-gray-50 text-gray-800",
        "disabled:opacity-50",
        className,
      ].join(" ")}
    />
  );
}
