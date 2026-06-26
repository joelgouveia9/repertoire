import type { Registry } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Where to register / join each organization.
//
// `register` is a join/registration page where known; `url` is the official site.
// `registerLink()` always returns a working URL (falls back to a site search), so
// every finding in the UI can link an artist straight to the place that fixes it.
// ─────────────────────────────────────────────────────────────────────────────

interface Link {
  url: string;
  register?: string;
}

const LINKS: Record<string, Link> = {
  // United States
  ascap: { url: "https://www.ascap.com", register: "https://www.ascap.com/music-creators/join" },
  bmi: { url: "https://www.bmi.com", register: "https://www.bmi.com/join" },
  sesac: { url: "https://www.sesac.com" },
  gmr: { url: "https://globalmusicrights.com" },
  themlc: { url: "https://www.themlc.com", register: "https://www.themlc.com/join" },
  hfa: { url: "https://www.harryfox.com" },
  soundexchange: {
    url: "https://www.soundexchange.com",
    register: "https://www.soundexchange.com/artist-copyright-owner/register/",
  },
  // Canada
  socan: { url: "https://www.socan.com", register: "https://www.socan.com/join" },
  cmrra: { url: "https://www.cmrra.ca" },
  resound: { url: "https://www.resound.ca" },
  // Mexico
  sacm: { url: "https://www.sacm.org.mx" },
  // UK & Ireland
  prs: { url: "https://www.prsformusic.com", register: "https://www.prsformusic.com/join" },
  mcps: { url: "https://www.prsformusic.com", register: "https://www.prsformusic.com/join" },
  ppl: { url: "https://www.ppluk.com", register: "https://www.ppluk.com/join-us/" },
  imro: { url: "https://www.imro.ie", register: "https://www.imro.ie/membership/" },
  ppi: { url: "https://www.ppimusic.ie" },
  // Western Europe
  sacem: { url: "https://www.sacem.fr", register: "https://createurs-editeurs.sacem.fr/en/join-sacem" },
  sdrm: { url: "https://www.sacem.fr" },
  spre: { url: "https://www.spre.fr" },
  gema: { url: "https://www.gema.de", register: "https://www.gema.de/en/music-creators/become-a-member" },
  gema_mech: { url: "https://www.gema.de", register: "https://www.gema.de/en/music-creators/become-a-member" },
  gvl: { url: "https://gvl.de" },
  siae: { url: "https://www.siae.it" },
  scf: { url: "https://www.scfitalia.it" },
  sgae: { url: "https://www.sgae.es" },
  agedi: { url: "https://www.agedi.es" },
  spa: { url: "https://www.spautores.pt" },
  buma: { url: "https://www.bumastemra.nl" },
  stemra: { url: "https://www.bumastemra.nl" },
  sena: { url: "https://www.sena.nl" },
  sabam: { url: "https://www.sabam.be" },
  suisa: { url: "https://www.suisa.ch" },
  akm: { url: "https://www.akm.at" },
  // Nordics
  stim: { url: "https://www.stim.se" },
  sami: { url: "https://www.sami.se" },
  ncb: { url: "https://www.ncb.dk" },
  koda: { url: "https://www.koda.dk" },
  tono: { url: "https://www.tono.no" },
  teosto: { url: "https://www.teosto.fi" },
  // Central & Eastern Europe
  zaiks: { url: "https://zaiks.org.pl" },
  osa: { url: "https://www.osa.cz" },
  artisjus: { url: "https://www.artisjus.hu" },
  rao: { url: "https://rao.ru" },
  // Latin America
  ecad: { url: "https://www.ecad.org.br" },
  sadaic: { url: "https://www.sadaic.org.ar" },
  scd: { url: "https://www.scd.cl" },
  sayco: { url: "https://www.sayco.org" },
  // Asia–Pacific
  jasrac: { url: "https://www.jasrac.or.jp/ejhp/" },
  nextone: { url: "https://www.nex-tone.co.jp" },
  riaj: { url: "https://www.riaj.or.jp" },
  komca: { url: "https://www.komca.or.kr" },
  mcsc: { url: "http://www.mcsc.com.cn" },
  iprs: { url: "https://www.iprs.org" },
  cash: { url: "https://www.cash.org.hk" },
  compass: { url: "https://www.compass.org.sg" },
  macp: { url: "https://www.macp.com.my" },
  wami: { url: "https://wami.id" },
  filscap: { url: "https://www.filscap.com.ph" },
  must: { url: "https://www.must.org.tw" },
  apra: { url: "https://www.apraamcos.com.au", register: "https://www.apraamcos.com.au/member/join" },
  amcos: { url: "https://www.apraamcos.com.au", register: "https://www.apraamcos.com.au/member/join" },
  ppca: { url: "https://www.ppca.com.au" },
  // Middle East & Africa
  acum: { url: "https://www.acum.org.il" },
  samro: { url: "https://www.samro.org.za" },
  sampra: { url: "https://www.sampra.org.za" },
  // Hubs
  ice: { url: "https://www.iceservices.com" },
  armonia: { url: "https://www.armoniaonline.eu" },
  mint: { url: "https://www.mint-digital.com" },
};

/** Always returns a usable link: register page → site → web search fallback. */
export function registerLink(r: Registry): string {
  const l = LINKS[r.id];
  if (l?.register) return l.register;
  if (l?.url) return l.url;
  return `https://www.google.com/search?q=${encodeURIComponent(`${r.name} register works`)}`;
}
