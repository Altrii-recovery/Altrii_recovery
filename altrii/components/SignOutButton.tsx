"use client";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/sign-in" })}
      className="rounded bg-black text-white px-3 py-2"
    >
      Sign out
    </button>
  );
}
