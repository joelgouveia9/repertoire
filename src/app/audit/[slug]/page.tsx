import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getArtist } from "@/lib/seed";
import { auditArtist } from "@/lib/audit";
import { AuditView } from "@/components/AuditView";

export function generateStaticParams() {
  return [{ slug: "nova-sol" }, { slug: "atlas-kidd" }];
}

export default async function AuditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = getArtist(slug);
  if (!artist) notFound();

  const audit = auditArtist(artist);

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <Link href="/#artists" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-300">
        <ArrowLeft className="h-4 w-4" /> All catalogs
      </Link>
      <AuditView audit={audit} />
    </main>
  );
}
