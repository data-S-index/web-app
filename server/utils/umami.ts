import type { H3Event } from "h3";
import { Umami } from "@umami/node";
import { consola } from "consola";
import { getDoiSource } from "./reference";

// Same website as the frontend tracker in app/app.vue
const UMAMI_WEBSITE_ID = "a259fbbd-af7d-4fa6-b940-408f301706f2";

// Rename the collect endpoint to /api/harvest - see the tracker script at /mushroom. @umami/node hardcodes /api/send, so override send() to post to the custom endpoint instead.
const UMAMI_COLLECT_PATH = "/api/harvest";

class CustomEndpointUmami extends Umami {
  override send(
    payload: Parameters<Umami["send"]>[0],
    type: "event" | "identify" = "event",
  ) {
    const { hostUrl, userAgent } = this.options;

    return fetch(`${hostUrl}${UMAMI_COLLECT_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": userAgent || "Mozilla/5.0",
      },
      body: JSON.stringify({ type, payload }),
    });
  }
}

const umami = new CustomEndpointUmami({
  hostUrl: process.env.UMAMI_HOST_URL || "https://umami.fairdataihub.org",
  websiteId: UMAMI_WEBSITE_ID,
  // Umami drops anything that looks like a bot, so use a browser-like UA
  userAgent: "Mozilla/5.0 (Server; ScholarData API)",
});

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

  const request = umami
    .track({ hostname: getHostname(), language: "en-US", ...umamiEvent })
    .then((res) => {
      if (!res.ok) {
        consola.warn(`Umami tracking failed: ${res.status} ${res.statusText}`);
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
