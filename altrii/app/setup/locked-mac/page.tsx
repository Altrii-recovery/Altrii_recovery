export default function LockedSetupMac() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Locked Setup (Mac)</h1>
      <p className="text-sm text-muted-foreground">
        This sets your iPhone to <strong>Supervised</strong> and installs a <strong>non-removable</strong> Altrii profile.
        It also disables “Erase All Content &amp; Settings” in iOS Settings.
        <br />Please <strong>back up</strong> your device first (supervision erases it).
      </p>
      <ol className="list-decimal space-y-3 pl-5">
        <li>On a Mac, install <b>Apple Configurator 2</b> from the Mac App Store.</li>
        <li>Plug your iPhone into the Mac and tap <b>“Trust This Computer”</b> on the phone.</li>
        <li>In Terminal (inside your project folder), run:
          <pre className="mt-2 rounded bg-muted p-3 text-sm">node helper-mac/altrii-helper.mjs</pre>
        </li>
        <li>Follow the prompts to supervise &amp; install the locked profile.</li>
        <li>Return to your Dashboard and click <b>Mark as Supervised</b> on your device.</li>
      </ol>
      <p className="text-sm text-muted-foreground">Need help? Contact support and we’ll guide you.</p>
    </div>
  );
}
