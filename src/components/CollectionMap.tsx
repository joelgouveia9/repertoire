import { ExternalLink, Globe2, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import type { ArtistAudit } from "@/lib/types";
import { buildCollectionPlan, type Coverage } from "@/lib/markets";
import { moneyFull } from "@/lib/format";

const COVERAGE_BADGE: Record<Coverage, { label: string; cls: string; icon: React.ReactNode }> = {
  reciprocal: {
    label: "Covered via reciprocal agreements",
    cls: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/20",
    icon: <RefreshCw className="h-3.5 w-3.5" />,
  },
  direct: {
    label: "Needs direct registration",
    cls: "text-amber-300 bg-amber-500/10 ring-amber-500/20",
    icon: <Wrench className="h-3.5 w-3.5" />,
  },
  partial: {
    label: "Partly reciprocal — register directly",
    cls: "text-rose-300 bg-rose-500/10 ring-rose-500/20",
    icon: <Wrench className="h-3.5 w-3.5" />,
  },
};

export function CollectionMap({ audit }: { audit: ArtistAudit }) {
  const plan = buildCollectionPlan(audit);
  if (plan.total <= 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2">
        <Globe2 className="h-5 w-5 text-emerald-300" />
        <h2 className="text-lg font-semibold text-white">Collecting globally — what you actually need</h2>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-neutral-400">
        You don&apos;t need to register with a society in every country. Each royalty stream travels across
        borders differently — here&apos;s what&apos;s already covered by reciprocal agreements and what needs
        direct action.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <div className="text-[12px] font-medium text-neutral-400">Est. global royalties / yr</div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums text-white">{moneyFull(plan.total)}</div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Covered by reciprocal agreements
          </div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums text-emerald-200">{moneyFull(plan.reciprocalValue)}</div>
          <div className="mt-0.5 text-[12px] text-neutral-500">Performance — once you&apos;re in a home PRO</div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-amber-300">
            <Wrench className="h-3.5 w-3.5" /> Needs direct registration
          </div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums text-amber-200">{moneyFull(plan.directActionValue)}</div>
          <div className="mt-0.5 text-[12px] text-neutral-500">Mechanical + neighbouring rights</div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {plan.streams.map((s) => {
          const badge = COVERAGE_BADGE[s.coverage];
          return (
            <div key={s.key} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-[15px] font-medium text-white">{s.title}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${badge.cls}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>
                </div>
                <span className="text-[13px] font-semibold text-neutral-300">{moneyFull(s.value)}/yr est.</span>
              </div>

              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-neutral-400">{s.note}</p>

              {s.orgs.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {s.orgs.map((o) => (
                    <a
                      key={o.id}
                      href={o.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[12px] font-medium text-neutral-200 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <span>{o.flag}</span>
                      {o.abbr}
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-neutral-600">
        Values are directional estimates split by typical stream shares. Performance is collected worldwide via
        your home PRO&apos;s reciprocal agreements (the CISAC network), so it isn&apos;t a per-country gap —
        the action items are mechanical claiming and neighbouring-rights registration.
      </p>
    </section>
  );
}
