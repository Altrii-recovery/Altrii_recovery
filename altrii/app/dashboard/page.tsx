import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { LockButton } from "@/components/LockButton";
import { LockCountdown } from "@/components/LockCountdown";
import { MarkSupervisedButton } from "@/components/MarkSupervisedButton";
import { DeviceBlockingForm } from "@/components/DeviceBlockingForm";

type BlockingSettings = {
  adult: boolean;
  social: boolean;
  gambling: boolean;
  customAllowedDomains: string[];
};

function normalizeSettings(raw: unknown): BlockingSettings {
  const fallback: BlockingSettings = { adult: true, social: false, gambling: false, customAllowedDomains: [] };
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;
  return {
    adult: typeof r.adult === "boolean" ? r.adult : true,
    social: typeof r.social === "boolean" ? r.social : false,
    gambling: typeof r.gambling === "boolean" ? r.gambling : false,
    customAllowedDomains: Array.isArray(r.customAllowedDomains)
      ? (r.customAllowedDomains.filter((d) => typeof d === "string") as string[])
      : [],
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <div className="p-6">
        <p>Please sign in.</p>
        <Link className="text-blue-600 underline" href="/sign-in">Go to Sign In</Link>
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: { devices: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <Link className="rounded border px-3 py-1 text-sm hover:bg-muted" href="/settings">Settings</Link>
          <Link className="rounded border px-3 py-1 text-sm hover:bg-muted" href="/setup/locked-mac">Locked Setup (Mac)</Link>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Your Devices</h2>
        {!user?.devices?.length ? (
          <p className="text-sm text-muted-foreground">
            No devices yet. Add one below, then run <b>Locked Setup (Mac)</b> to make it non-removable.
          </p>
        ) : (
          <ul className="space-y-3">
            {user.devices.map((d) => {
              const supervised = (d as any).supervised as boolean | undefined;
              const settings = normalizeSettings(d.blockingSettings as unknown);

              return (
                <li key={d.id} className="rounded border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{d.name || "My iPhone"}</span>
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${supervised ? "bg-green-600 text-white" : "bg-amber-500 text-white"}`}
                          title={supervised ? "Non-removable profile enforced" : "Standard profile"}
                        >
                          {supervised ? "Supervised" : "Standard"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.platform} • {d.lockUntil ? "Locked until" : "Not locked"}
                        {d.lockUntil ? <> {new Date(d.lockUntil).toLocaleString()}</> : null}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <LockButton deviceId={d.id} lockUntil={d.lockUntil ? new Date(d.lockUntil).toISOString() : null} />
                      {d.lockUntil && <LockCountdown until={new Date(d.lockUntil).toISOString()} />}
                      {!supervised && <MarkSupervisedButton deviceId={d.id} />}
                    </div>
                  </div>

                  {/* Per-device blocking settings */}
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Blocking Settings</h4>
                    <DeviceBlockingForm deviceId={d.id} initial={settings} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Add device form */}
      <section className="rounded border p-4">
        <h3 className="mb-2 text-sm font-medium">Add a Device</h3>
        <form className="flex gap-2" action="/api/devices" method="post">
          <input name="name" placeholder="Device name" className="w-full rounded border px-3 py-2 text-sm" required />
          <button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90" type="submit">
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
