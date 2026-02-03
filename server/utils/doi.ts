/**
 * Normalize a DOI string so that it can be consistently used for lookups.
 *
 * - Decodes URL-encoded values (e.g. %2F)
 * - Trims whitespace
 * - Strips common DOI URL prefixes (https://doi.org/, doi:, etc.)
 * - Lowercases the remaining identifier
 */
export default function normalizeDoi(input: string): string {
  const rawDoi = decodeURIComponent(input).trim();

  const lowerRaw = rawDoi.toLowerCase();
  const DOI_PREFIXES = [
    "https://doi.org/",
    "http://doi.org/",
    "https://dx.doi.org/",
    "http://dx.doi.org/",
    "doi.org/",
    "doi:",
  ];

  let normalizedDoi = lowerRaw;
  for (const prefix of DOI_PREFIXES) {
    if (normalizedDoi.startsWith(prefix)) {
      normalizedDoi = normalizedDoi.slice(prefix.length);
      break;
    }
  }

  return normalizedDoi.trim();
}
