import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { getArtistCatalog } from "@/lib/deezer";
import { CatalogError } from "@/lib/source-util";
import { StatementVerify, type CatalogSong } from "@/components/StatementVerify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ artist?: string }> }) {
  const { artist } = await searchParams;

  let body: React.ReactNode;
  if (!artist) {
    body = (
      <div className="mt-8 rounded-xl border border-white/8 bg-white/[0.02] p-6 text-sm text-neutral-400">
        Open an artist&apos;s audit and click <span className="text-white">&ldquo;Verify with your statement&rdquo;</span>{" "}
        to reconcile their catalog against your real royalty data.
        <div className="mt-3">
          <Link href="/find" className="text-emerald-300 hover:text-emerald-200">
            → Find an artist
          </Link>
        </div>
      </div>
    );
  } else {
    try {
      const cat = await getArtistCatalog(artist);
      const songs: CatalogSong[] = cat.songs.map((s) => ({
        title: s.title,
        isrc: s.isrc,
        iswc: s.iswc,
        estAnnualRoyalty: s.estAnnualRoyalty,
      }));
      body = <StatementVerify artistName={cat.name} artistId={artist} songs={songs} />;
    } catch (e) {
      const msg = e instanceof CatalogError ? e.message : "Couldn't load this artist's catalog.";
      body = <p className="mt-8 rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-sm text-rose-300">{msg}</p>;
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-8">
      <Link
        href={artist ? `/audit/live/${artist}` : "/find"}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-300"
      >
        <ArrowLeft className="h-4 w-4" /> {artist ? "Back to audit" : "Find an artist"}
      </Link>

      <div className="mt-5 flex items-center gap-2">
        <FileText className="h-5 w-5 text-emerald-300" />
        <h1 className="text-2xl font-semibold tracking-tight text-white">Verify with your statement</h1>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-neutral-500">
        Upload a royalty statement (CSV from your distributor or PRO) to check it against the catalog — this is{" "}
        <span className="text-neutral-300">real registration data</span>, not an estimate.
      </p>

      {body}
    </main>
  );
}
