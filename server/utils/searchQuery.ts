// Matches a bare DOI, e.g. "10.5061/dryad.abc123"
const DOI_REGEX = /^10\.\d{4,9}\/\S+$/i;

// Matches a bare ORCID iD, e.g. "0000-0002-1825-0097"
const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i;

const DOI_URL_PREFIXES = [
  "https://doi.org/",
  "http://doi.org/",
  "https://dx.doi.org/",
  "http://dx.doi.org/",
  "doi.org/",
  "doi:",
];

const ORCID_URL_PREFIXES = [
  "https://orcid.org/",
  "http://orcid.org/",
  "orcid.org/",
];

function stripPrefix(value: string, prefixes: string[]): string {
  const lower = value.toLowerCase();
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) {
      return value.slice(prefix.length);
    }
  }

  return value;
}

/**
 * If the given search term is a bare DOI or ORCID iD (optionally prefixed with
 * its resolver URL), wrap it in quotes so Meilisearch treats it as an exact
 * phrase match instead of matching loosely on its parts. Terms the user has
 * already quoted, or that don't look like an identifier, are returned as-is.
 */
export function autoExactMatchSearchTerm(searchTerm: string): string {
  const trimmed = searchTerm.trim();

  if (!trimmed || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return searchTerm;
  }

  const withoutDoiPrefix = stripPrefix(trimmed, DOI_URL_PREFIXES);
  if (DOI_REGEX.test(withoutDoiPrefix)) {
    return `"${withoutDoiPrefix}"`;
  }

  const withoutOrcidPrefix = stripPrefix(trimmed, ORCID_URL_PREFIXES);
  if (ORCID_REGEX.test(withoutOrcidPrefix)) {
    return `"${withoutOrcidPrefix.toUpperCase()}"`;
  }

  return searchTerm;
}
