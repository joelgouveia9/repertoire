import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getArtistCatalog, SpotifyError } from "@/lib/spotify";
import { auditArtist } from "@/lib/audit";
import { AuditView } from "@/components/AuditView";
import { ConnectSpotify } from "@/components/ConnectSpotify";

export const dynamic = "force-dynamic";
// Pulling a full catalog from Spotify (with rate-limit backoff) can take a while.
export const maxDuration = 60;

export default async function LiveAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: React.ReactNode;
  try {
    const artist = await getArtistCatalog(id);
    if (artist.songs.length === 0) {
      body = (
        <p className="mt-8 rounded-xl border border-white/8 bg-white/[0.02] p-6 text-sm text-neutral-400">
          We found <span className="text-white">{artist.name}</span> but couldn&apos;t read any recordings with
          ISRCs from Spotify. Try another artist.
        </p>
      );
    } else {
      body = <AuditView audit={auditArtist(artist)} />;
    }
  } catch (e) {
    if (e instanceof SpotifyError && e.code === "no_creds") {
      body = (
        <div className="mt-8">
          <ConnectSpotify />
        </div>
      );
    } else {
      const msg = e instanceof SpotifyError ? e.message : "Something went wrong loading this artist.";
      body = (
        <p className="mt-8 rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-sm text-rose-300">{msg}</p>
      );
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <Link href="/find" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-300">
        <ArrowLeft className="h-4 w-4" /> Search again
      </Link>
      {body}
    </main>
  );
}
