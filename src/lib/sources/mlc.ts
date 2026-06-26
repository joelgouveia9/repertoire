import type { RepertoireSource, RecordingQuery, WorkCandidate } from "../matching";

// ─────────────────────────────────────────────────────────────────────────────
// The MLC (Mechanical Licensing Collective) connector — SCAFFOLD.
//
// The MLC is the legitimate, sanctioned way to actually VERIFY US mechanical
// registration: under the Music Modernization Act it must keep a public musical-
// works database, and it offers a Public Search API + bulk (DDEX/BWARM) feed that
// map ISRC → registered work → writers / publishers / splits / ISWC.
//
// This connector implements our `RepertoireSource` interface so that, the moment
// real credentials exist, the audit verifies against MLC data instead of guessing.
// It is intentionally inert until configured — see docs/mlc-access.md for how to
// register (we qualify as a "music technology company"; contact bulk.data@themlc.com).
//
// Activate by setting in the environment:
//   MLC_API_BASE   = <the Public Search API base URL provided at registration>
//   MLC_API_KEY    = <your API key>
// Then replace the request/response mapping below with the real BWARM shapes from
// the API docs you receive. Until then `configured()` is false and we never call.
// ─────────────────────────────────────────────────────────────────────────────

export function mlcConfigured(): boolean {
  return Boolean(process.env.MLC_API_BASE && process.env.MLC_API_KEY);
}

export const mlcSource: RepertoireSource = {
  registryId: "themlc",
  async search(query: RecordingQuery): Promise<WorkCandidate[]> {
    if (!mlcConfigured()) return [];
    try {
      // NOTE: endpoint + payload shape are placeholders until we have the API docs
      // that come with registration. The MLC keys works by ISRC, which is ideal —
      // we already have ISRCs from Deezer.
      const url = `${process.env.MLC_API_BASE}/works/search?isrc=${encodeURIComponent(query.isrc ?? "")}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.MLC_API_KEY}`, Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return [];
      const data = (await res.json()) as MlcResponse;
      return (data.works ?? []).map(mapWork);
    } catch {
      return [];
    }
  },
};

// Placeholder response shapes — replace with the documented BWARM/DDEX schema.
interface MlcResponse {
  works?: MlcWork[];
}
interface MlcWork {
  workTitle?: string;
  iswc?: string;
  mlcWorkNumber?: string;
  writers?: { name?: string; role?: string; share?: number }[];
  publishers?: { name?: string; share?: number }[];
}

function mapWork(w: MlcWork): WorkCandidate {
  return {
    registryId: "themlc",
    workNumber: w.mlcWorkNumber ?? "",
    title: w.workTitle ?? "",
    iswc: w.iswc,
    writers: (w.writers ?? []).map((x) => ({ name: x.name ?? "", role: "writer", sharePct: x.share })),
    publishers: (w.publishers ?? []).map((x) => ({ name: x.name ?? "", role: "publisher", sharePct: x.share })),
  };
}
