import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { LockButton } from "@/components/LockButton";
import { LockCountdown } from "@/components/LockCountdown";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: { devices: true },
  });

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">My Devices</h1>

      {user.devices.length ? (
        <ul className="space-y-2">
          {user.devices.map((d) => {
            const lockUntilIso = d.lockUntil ? d.lockUntil.toISOString() : null;
            return (
              <li key={d.id} className="rounded border p-3">
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
                    <LockButton deviceId={d.id} lockUntil={lockUntilIso} />
                    {lockUntilIso && <LockCountdown until={lockUntilIso} />}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No devices registered yet.</p>
      )}
    </main>
  );
}
