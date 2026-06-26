import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { searchArtists, parseArtistId } from "@/lib/deezer";
import { CatalogError } from "@/lib/source-util";
import { listeners } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FindPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  // A pasted MusicBrainz link/ID jumps straight to the audit.
  const directId = query ? parseArtistId(query) : null;
  if (directId) redirect(`/audit/live/${directId}`);

  let hits: Awaited<ReturnType<typeof searchArtists>> = [];
  let error: string | null = null;
  if (query) {
    try {
      hits = await searchArtists(query);
    } catch (e) {
      error = e instanceof CatalogError ? e.message : "Search failed.";
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-300">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">Audit a real catalog</h1>
      <p className="mt-1 text-sm text-neutral-500">Search any artist — we pull their full catalog from streaming.</p>

      <form action="/find" method="get" className="mt-6 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 focus-within:border-emerald-500/50">
          <Search className="h-4 w-4 text-neutral-500" />
          <input
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Artist name…"
            className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-neutral-600"
          />
        </div>
        <button className="rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400">
          Search
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

      {query && !error && hits.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">No artists found for &ldquo;{query}&rdquo;.</p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {hits.map((a) => (
          <Link
            key={a.id}
            href={`/audit/live/${a.id}`}
            className="group flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-3.5 transition-all hover:border-white/15 hover:bg-white/[0.04]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-white/10 to-white/5 text-lg font-semibold text-neutral-300 ring-1 ring-white/10">
              {a.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.image} alt={a.name} className="h-full w-full object-cover" />
              ) : (
                a.name.charAt(0).toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium text-white">{a.name}</div>
              <div className="mt-0.5 truncate text-[13px] text-neutral-500">
                {[
                  a.fans ? `${listeners(a.fans)} fans` : null,
                  a.albums ? `${a.albums} release${a.albums > 1 ? "s" : ""}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Artist"}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-300" />
          </Link>
        ))}
      </div>
    </main>
  );
}
