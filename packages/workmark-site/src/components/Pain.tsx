export function Pain() {
  return (
    <section className="px-6 py-20 border-t border-paper-line dark:border-ink-line">
      <div className="max-w-3xl mx-auto">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-deep dark:text-accent mb-4 text-center">
          The problem
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
          Every workspace collects a graveyard.
        </h2>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-sm">
          <GraveyardItem label="scripts/deploy.sh" hint="the one Ben wrote" />
          <GraveyardItem label="package.json scripts" hint="half aliases, half lies" />
          <GraveyardItem label="Makefile" hint="only Alice remembers" />
          <GraveyardItem label="docs/ONBOARDING.md" hint="don't actually run step 4" />
          <GraveyardItem label="bin/rebuild-assets.ts" hint="usage: ???" />
          <GraveyardItem label="notion page from 2023" hint="out of date, unclear how" />
        </div>

        <p className="mt-10 text-lg opacity-70 leading-relaxed text-center max-w-2xl mx-auto">
          Each tool has its own conventions. None of them show up in your editor.
          None of them are discoverable by an AI assistant. And every new hire
          learns them by asking in Slack.
        </p>
      </div>
    </section>
  );
}

function GraveyardItem({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-baseline gap-3 px-3 py-2 rounded-md bg-paper-soft dark:bg-ink-soft border border-paper-line dark:border-ink-line">
      <span className="shrink-0">{label}</span>
      <span className="text-xs opacity-50 truncate">{hint}</span>
    </div>
  );
}
