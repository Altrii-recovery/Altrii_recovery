"use client";
import { InputHTMLAttributes } from "react";
export function Switch({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={["inline-flex cursor-pointer items-center", className].join(" ")}>
      <input type="checkbox" className="peer sr-only" {...rest} />
      <span className="h-5 w-9 rounded-full bg-gray-300 transition peer-checked:bg-black relative">
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
