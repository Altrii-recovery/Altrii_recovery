import { HTMLAttributes } from "react";
export function Alert({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={["rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm", className].join(" ")}
    />
  );
}
