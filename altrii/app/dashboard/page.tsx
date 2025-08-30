import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { LockButton } from "@/components/LockButton";
import { LockCountdown } from "@/components/LockCountdown";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: { devices: true },
  });
  if (!user) redirect("/sign-in");

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
          <form action="/api/stripe/portal" method="post">
            <Button type="submit">Manage billing</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Devices</h2>
        </CardHeader>
        <CardContent>
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
                          href={user.planStatus === "active" ? `/api/profile/${d.id}` : "#"}
                          className={`rounded-lg border px-3 py-1 text-sm ${
                            user.planStatus === "active" ? "hover:bg-gray-50" : "opacity-50 pointer-events-none"
                          }`}
                          aria-disabled={user.planStatus !== "active"}
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
