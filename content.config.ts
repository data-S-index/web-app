import { defineContentConfig, defineCollection, z } from "@nuxt/content";
import { defineSitemapSchema } from "@nuxtjs/sitemap/content";

export default defineContentConfig({
  collections: {
    announcements: defineCollection({
      type: "page",
      source: "announcements/*.md",
      schema: z.object({
        date: z.string(),
        // Set `sitemap: false` in a post's frontmatter to keep it out of the
        // sitemap and off the /announcements listing (used for the test post).
        sitemap: defineSitemapSchema(),
      }),
    }),
  },
});
