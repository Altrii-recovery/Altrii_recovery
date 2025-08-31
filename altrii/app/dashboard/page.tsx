import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { syncUserSubscriptionByEmail } from "@/lib/subscription";
import { LockButton } from "@/components/LockButton";
import { LockCountdown } from "@/components/LockCountdown";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Search = { [key: string]: string | string[] | undefined };

export default async function DashboardPage({ searchParams }: { searchParams: Search }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/sign-in");

  // If we just returned from Stripe (?status=success), sync before rendering
  const status = typeof searchParams.status === "string" ? searchParams.status : undefined;
  if (status === "success") {
    await syncUserSubscriptionByEmail(session.user.email);
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: { devices: true },
  });
  if (!user) redirect("/sign-in");

  const isActive = user.planStatus === "active";
  const planLabel =
    user.plan === "MONTH" ? "Monthly (£12)" :
    user.plan === "THREE_MONTH" ? "3 months (£30)" :
    user.plan === "SIX_MONTH" ? "6 months (£50)" :
    user.plan === "YEAR" ? "Yearly (£90)" : "No plan";

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <a className="underline text-sm" href="/account">Account</a>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Subscription</h2>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <div>Status: <span className="font-medium">{user.planStatus ?? "inactive"}</span></div>
            <div>Plan: <span className="font-medium">{planLabel}</span></div>
          </div>

          {isActive ? (
            <form action="/api/stripe/portal" method="post">
              <Button type="submit">Manage billing</Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <a href="/subscription" className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
                Subscribe now
              </a>
              <form action="/api/stripe/refresh" method="post">
                <Button type="submit" className="text-xs px-3 py-2">Refresh</Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Devices</h2>
        </CardHeader>
        <CardContent>
          {isActive && user.devices.length < 3 && (
            <form action="/api/devices" method="post" className="mb-4 flex items-center gap-2">
              <input
                type="text"
                name="name"
                placeholder="Device name (e.g., My iPhone)"
                className="w-64 rounded border px-3 py-2 text-sm"
                required
              />
              <input type="hidden" name="platform" value="ios" />
              <Button type="submit">Add device</Button>
              <span className="text-xs text-gray-500">You can register up to 3 devices.</span>
            </form>
          )}

          {user.devices.length ? (
            <ul className="space-y-3">
              {user.devices.map((d) => {
                const lockUntilIso = d.lockUntil ? d.lockUntil.toISOString() : null;
                return (
                  <li key={d.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{d.name}</div>
                        <div className="text-sm text-gray-600">
                          {d.lockUntil
                            ? `Locked until ${new Date(d.lockUntil).toLocaleString()}`
                            : "Not locked"}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <a
                          href={isActive ? `/api/profile/${d.id}` : "#"}
                          className={`rounded-lg border px-3 py-1 text-sm ${
                            isActive ? "hover:bg-gray-50" : "opacity-50 pointer-events-none"
                          }`}
                          aria-disabled={!isActive}
                        >
                          Download profile
                        </a>
                        <LockButton deviceId={d.id} lockUntil={lockUntilIso} />
                        {lockUntilIso && <LockCountdown until={lockUntilIso} />}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-700">No devices registered yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
