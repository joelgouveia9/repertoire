import { ExternalLink, KeyRound } from "lucide-react";

/** Shown when SPOTIFY_CLIENT_ID/SECRET aren't configured. Plain setup guidance. */
export function ConnectSpotify() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
      <div className="flex items-center gap-2 text-emerald-300">
        <KeyRound className="h-5 w-5" />
        <h2 className="text-lg font-semibold text-white">Connect Spotify to pull real catalogs</h2>
      </div>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-neutral-400">
        Live audits read an artist&apos;s recordings and ISRCs straight from Spotify. It takes about
        two minutes to set up and is free.
      </p>
      <ol className="mt-4 flex max-w-2xl flex-col gap-2 text-[14px] text-neutral-300">
        <li className="flex gap-2">
          <span className="font-semibold text-emerald-300">1.</span>
          <span>
            Open the{" "}
            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-emerald-300 underline underline-offset-2"
            >
              Spotify Developer Dashboard <ExternalLink className="h-3 w-3" />
            </a>{" "}
            and click <span className="font-medium text-white">Create app</span>.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-emerald-300">2.</span>
          <span>Copy the app&apos;s <span className="font-medium text-white">Client ID</span> and <span className="font-medium text-white">Client secret</span>.</span>
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-emerald-300">3.</span>
          <span>
            Add them to a file called <code className="rounded bg-black/40 px-1.5 py-0.5 text-[13px] text-emerald-200">.env.local</code> in the project:
          </span>
        </li>
      </ol>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-black/50 p-3 text-[13px] text-neutral-300 ring-1 ring-white/10">
        <code>{`SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret`}</code>
      </pre>
      <p className="mt-3 text-[13px] text-neutral-500">Then restart the dev server. (Demo catalogs work without this.)</p>
    </div>
  );
}
