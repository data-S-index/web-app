import type { H3Event } from "h3";
import { consola } from "consola";
import { getDoiSource } from "./reference";

// Same website as the frontend tracker in app/app.vue
const UMAMI_WEBSITE_ID = "a259fbbd-af7d-4fa6-b940-408f301706f2";

const UMAMI_HOST_URL =
  process.env.UMAMI_HOST_URL || "https://umami.fairdataihub.org";

// A User-Agent is required, and Umami silently drops anything that looks
// like a bot (responds 200 with {"beep":"boop"}). Short or generic UAs like
// "Mozilla/5.0 (Server)" trip its bot check, so send a full browser UA.
const UMAMI_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const getHostname = () => {
  try {
    if (process.env.NUXT_SITE_URL) {
      return new URL(process.env.NUXT_SITE_URL).hostname;
    }
  } catch {
    // fall through to default
  }

  return "scholardata.io";
};

interface UmamiEvent {
  name: string;
  url: string;
  data?: Record<string, string | number>;
}

/**
 * Send a custom event to Umami. Fire-and-forget: never throws and never
 * blocks the response. Skipped in development so local requests don't
 * pollute production analytics.
 */
export function trackUmamiEvent(event: H3Event, umamiEvent: UmamiEvent) {
  if (process.env.NUXT_SITE_ENV === "development") return;

  const request = fetch(`${UMAMI_HOST_URL}/api/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UMAMI_USER_AGENT,
    },
    body: JSON.stringify({
      type: "event",
      payload: {
        website: UMAMI_WEBSITE_ID,
        hostname: getHostname(),
        language: "en-US",
        ...umamiEvent,
      },
    }),
  })
    .then(async (res) => {
      const body = await res.text();

      if (!res.ok) {
        consola.warn(`Umami tracking failed: ${res.status} ${body}`);
      } else if (body.includes("beep")) {
        // Umami returns 200 {"beep":"boop"} when it drops a request as a bot
        consola.warn("Umami tracking dropped: request flagged as a bot");
      }
    })
    .catch((err) => consola.warn("Umami tracking failed:", err));

  // Keep serverless runtimes alive until the request completes
  event.waitUntil?.(request);
}

/**
 * Track a v1 by-doi API request. Always sends a general event, plus a
 * dedicated event for PhysioNet / SPARC DOIs so their volume can be
 * counted directly in the Umami dashboard.
 */
export function trackByDoiRequest(
  event: H3Event,
  endpoint: "by-doi" | "by-doi-citations",
  normalizedDoi: string,
) {
  const source = getDoiSource(normalizedDoi);
  const url =
    endpoint === "by-doi"
      ? "/api/v1/datasets/by-doi"
      : "/api/v1/datasets/by-doi/citations";
  const data = { endpoint, source, doi: normalizedDoi };

  trackUmamiEvent(event, { name: `api-v1-${endpoint}`, url, data });

  if (source !== "other") {
    trackUmamiEvent(event, {
      name: `api-v1-${endpoint}-${source}`,
      url,
      data,
    });
  }
}
