import {
  CircleAlert,
  AlertTriangle,
  CircleCheck,
  TrendingDown,
  Radio,
  FileText,
  Upload,
} from "lucide-react";
import { REGISTRIES, STREAM_LABELS } from "@/lib/registries";
import type { ArtistAudit, GroundTruthSource, IssueType } from "@/lib/types";
import { ROYALTY_MODEL_NOTE } from "@/lib/royalty-model";
import { listeners, money, moneyFull } from "@/lib/format";
import { ISSUE_TYPE_LABEL } from "@/lib/leak-guide";
import { HealthRing } from "./HealthRing";
import { SongScorecard } from "./SongScorecard";
import { CollectionMap } from "./CollectionMap";
import { LeakExplainers } from "./LeakExplainers";
import { ExportEarnings } from "./ExportEarnings";

const GROUND_TRUTH_LABEL: Record<GroundTruthSource, { icon: React.ReactNode; label: string }> = {
  distributor: { icon: <Radio className="h-3.5 w-3.5" />, label: "Distributor metadata" },
  manual: { icon: <FileText className="h-3.5 w-3.5" />, label: "Artist-confirmed" },
  statements: { icon: <Upload className="h-3.5 w-3.5" />, label: "Royalty statements" },
};

export function AuditView({ audit }: { audit: ArtistAudit }) {
  const { artist } = audit;

  // Money-at-risk grouped by issue type.
  const byType = new Map<IssueType, number>();
  for (const issue of audit.issues) byType.set(issue.type, (byType.get(issue.type) ?? 0) + issue.moneyAtRisk);
  const breakdown = [...byType.entries()].sort((a, b) => b[1] - a[1]);
  const maxBreak = Math.max(1, ...breakdown.map(([, v]) => v));

  const checkedRegistries = REGISTRIES.filter((r) => r.territory === artist.homeTerritory && !r.hub);
  const gt = artist.groundTruth ? GROUND_TRUTH_LABEL[artist.groundTruth] : null;

  return (
    <>
      {/* Header */}
      <section className="mt-5 flex flex-col gap-6 rounded-2xl border border-white/8 bg-white/[0.02] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 text-3xl font-semibold text-neutral-300 ring-1 ring-white/10">
            {artist.image && artist.image.startsWith("http") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artist.image} alt={artist.name} className="h-full w-full object-cover" />
            ) : (
              artist.image || artist.name.charAt(0).toUpperCase()
            )}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{artist.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-neutral-500">
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-neutral-400">{artist.homeTerritory}</span>
              <span>{audit.counts.songs} songs</span>
              {artist.monthlyListeners ? (
                <>
                  <span>·</span>
                  <span>{listeners(artist.monthlyListeners)} monthly listeners</span>
                </>
              ) : artist.followers ? (
                <>
                  <span>·</span>
                  <span>{listeners(artist.followers)} followers</span>
                </>
              ) : null}
              {gt && (
                <span className="inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-neutral-400">
                  {gt.icon}
                  {gt.label}
                </span>
              )}
              {artist.live && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                  ● Live from {artist.source ?? "public catalog"}
                </span>
              )}
            </div>
          </div>
        </div>
        <HealthRing score={audit.score} />
      </section>

      {/* Headline stats */}
      <section className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat
          tone="rose"
          icon={<TrendingDown className="h-4 w-4" />}
          label="Royalties at risk / yr"
          value={moneyFull(audit.totalMoneyAtRisk)}
          sub={`of ${moneyFull(audit.totalAnnualRoyalty)} est. annual`}
        />
        <Stat tone="rose" icon={<CircleAlert className="h-4 w-4" />} label="Critical issues" value={`${audit.counts.critical}`} sub="need action now" />
        <Stat tone="amber" icon={<AlertTriangle className="h-4 w-4" />} label="Warnings" value={`${audit.counts.warning}`} sub="worth fixing" />
        <Stat tone="emerald" icon={<CircleCheck className="h-4 w-4" />} label="Clean songs" value={`${audit.counts.fullyClean} / ${audit.counts.songs}`} sub="fully registered" />
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Songs */}
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Song-by-song scorecard</h2>
              <p className="mt-0.5 text-[12px] text-neutral-500">Estimated annual earnings shown per song, at 100% ownership.</p>
            </div>
            <ExportEarnings
              artist={artist.name}
              rows={audit.songAudits.map((s) => ({
                title: s.song.title,
                isrc: s.song.isrc,
                iswc: s.song.iswc,
                releaseDate: s.song.releaseDate,
                estAnnualRoyalty: s.song.estAnnualRoyalty,
                writers: s.song.expectedWriters.map((w) => w.name).join("; "),
                moneyAtRisk: s.moneyAtRisk,
              }))}
            />
          </div>
          <div className="flex flex-col gap-2.5">
            {audit.songAudits
              .slice()
              .sort((a, b) => b.moneyAtRisk - a.moneyAtRisk)
              .map((s) => (
                <SongScorecard key={s.song.isrc} audit={s} />
              ))}
          </div>
          {artist.live && (
            <p className="mt-4 text-[12px] leading-relaxed text-neutral-600">{ROYALTY_MODEL_NOTE}</p>
          )}
        </section>

        {/* Sidebar */}
        <aside className="flex flex-col gap-6">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <h3 className="text-sm font-semibold text-white">Where the money leaks</h3>
            <p className="mt-0.5 text-[12px] text-neutral-500">Annual exposure by problem type — tap to learn how to fix it</p>
            <ul className="mt-4 flex flex-col gap-3">
              {breakdown.map(([type, val]) => (
                <li key={type}>
                  <a href={`#leak-${type}`} className="group block">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-neutral-300 group-hover:text-white">{ISSUE_TYPE_LABEL[type]}</span>
                      <span className="font-semibold text-rose-300">{money(val)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400" style={{ width: `${(val / maxBreak) * 100}%` }} />
                    </div>
                  </a>
                </li>
              ))}
              {breakdown.length === 0 && <li className="text-[13px] text-emerald-300">No leaks detected 🎉</li>}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <h3 className="text-sm font-semibold text-white">Organizations checked</h3>
            <p className="mt-0.5 text-[12px] text-neutral-500">{artist.homeTerritory} · primary societies</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {checkedRegistries.map((r) => (
                <li key={r.id} className="flex items-center gap-2.5 text-[13px]">
                  <span className="text-base">{r.flag}</span>
                  <span className="font-medium text-neutral-200">{r.abbr}</span>
                  <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500">
                    {STREAM_LABELS[r.type].split(" ")[0]}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-neutral-600">
              Repertoire tracks {REGISTRIES.length} organizations globally. International registrations are checked as the catalog earns in new territories.
            </p>
          </div>
        </aside>
      </div>

      <LeakExplainers audit={audit} />
      <CollectionMap audit={audit} />
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "rose" | "amber" | "emerald";
}) {
  const toneCls = { rose: "text-rose-300", amber: "text-amber-300", emerald: "text-emerald-300" }[tone];
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <div className={`flex items-center gap-1.5 text-[12px] font-medium ${toneCls}`}>
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</div>
      <div className="mt-0.5 text-[12px] text-neutral-500">{sub}</div>
    </div>
  );
}
