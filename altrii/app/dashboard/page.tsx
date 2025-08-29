// app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { AddDeviceForm } from "@/components/AddDeviceForm";
import { LockButton } from "@/components/LockButton";
import { LockCountdown } from "@/components/LockCountdown";
import type { Device } from "@prisma/client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: { devices: true },
  });

  const hasActivePlan = user?.planStatus === "active";

  const planLabel =
    user?.plan === "MONTH"
      ? "Monthly (£12)"
      : user?.plan === "THREE_MONTH"
      ? "3 months (£30)"
      : user?.plan === "SIX_MONTH"
      ? "6 months (£50)"
      : user?.plan === "YEAR"
      ? "Yearly (£90)"
      : "No plan";

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <SignOutButton />
      </header>

      {!hasActivePlan && (
        <div className="rounded border border-amber-400 bg-amber-50 p-4">
          <p className="font-medium">Subscription required</p>
          <p className="text-sm text-amber-800">
            Adding devices and downloading profiles requires an active plan.
            <a className="underline ml-1" href="/subscription">
              Go to subscription →
            </a>
          </p>
        </div>
      )}

      <section className="rounded border p-4">
        <h2 className="text-lg font-medium mb-2">Subscription</h2>
        <p>
          Status:{" "}
          <span className="font-medium">{user?.planStatus ?? "inactive"}</span>
        </p>
        <p>
          Plan: <span className="font-medium">{planLabel}</span>
        </p>
        <div className="mt-3">
          <a href="/subscription" className="underline">
            Manage subscription
          </a>
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="text-lg font-medium mb-2">Devices</h2>

        {user?.devices?.length ? (
          <ul className="space-y-2">
            {user.devices.map((d: Device) => (
              <li key={d.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-sm text-gray-600">
                      {d.platform} •{" "}
                      {d.profileInstalled ? "Profile installed" : "No profile"}
                      {d.lockUntil ? (
                        <>
                          {` • locked until ${new Date(
                            d.lockUntil
                          ).toLocaleString()} `}
                          <LockCountdown
                            untilMs={new Date(d.lockUntil).getTime()}
                          />
                        </>
                      ) : (
                        ""
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href={hasActivePlan ? `/api/profile/${d.id}` : "#"}
                      className={`rounded border px-3 py-1 ${
                        hasActivePlan ? "" : "opacity-50 pointer-events-none"
                      }`}
                      aria-disabled={!hasActivePlan}
                    >
                      Download profile
                    </a>
                    <LockButton deviceId={d.id} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No devices yet. You can add up to 3 devices.</p>
        )}

        {hasActivePlan && user && (user.devices?.length ?? 0) < 3 ? (
          <AddDeviceForm />
        ) : (
          <p className="mt-3 text-sm text-gray-600">
            {!hasActivePlan
              ? "Activate a subscription to add devices."
              : "Device limit reached (3)"}
          </p>
        )}
      </section>
    </main>
  );
}
