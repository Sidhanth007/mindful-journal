export function CrisisNotice() {
  return (
    <aside role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="font-medium">If you&apos;re having a hard time right now, you deserve support from a real person.</p>
      <p className="mt-1">
        This app can&apos;t provide crisis help. If you might be in danger, contact your local emergency number now. To talk to someone: <strong>988</strong> (US), <strong>116 123</strong> (Samaritans, UK &amp; Ireland),{" "}
        <strong>9152987821</strong> (iCall, India), or find a line near you at{" "}
        <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="underline">
          findahelpline.com
        </a>
        .
      </p>
    </aside>
  );
}
