import { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={["rounded-xl border border-gray-200 bg-white shadow-sm", className].join(" ")}
    />
  );
}
export function CardHeader({ children, className="" }: {children: ReactNode, className?: string}) {
  return <div className={["p-4 border-b", className].join(" ")}>{children}</div>;
}
export function CardContent({ children, className="" }: {children: ReactNode, className?: string}) {
  return <div className={["p-4", className].join(" ")}>{children}</div>;
}
export function CardFooter({ children, className="" }: {children: ReactNode, className?: string}) {
  return <div className={["p-4 border-t", className].join(" ")}>{children}</div>;
}
