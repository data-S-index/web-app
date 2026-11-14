// DOI prefixes for partner repositories we want to track separately
// (these are also exempt from rate limiting on the v1 by-doi endpoints)
export const PHYSIONET_DOI_PREFIX = "10.13026";
export const NIH_SPARC_PREFIX = "10.26275";

export type DoiSource = "physionet" | "sparc" | "other";

export function getDoiSource(normalizedDoi: string): DoiSource {
  if (normalizedDoi.startsWith(PHYSIONET_DOI_PREFIX)) return "physionet";
  if (normalizedDoi.startsWith(NIH_SPARC_PREFIX)) return "sparc";

  return "other";
}
