import { defineContentConfig, defineCollection, z } from "@nuxt/content";
import { defineSitemapSchema } from "@nuxtjs/sitemap/content";

export default defineContentConfig({
  collections: {
    announcements: defineCollection({
      type: "page",
      source: "announcements/*.md",
      schema: z.object({
        date: z.string(),
        // Set `draft: true` in a post's frontmatter to keep it off the
        // /announcements listing (used for the test post).
        draft: z.boolean().optional(),
        sitemap: defineSitemapSchema(),
        // Set to link the post straight to an outside URL (e.g. a press
        // article) instead of rendering the Markdown body on its own page.
        externalUrl: z.string().url().optional(),
      }),
    }),
  },
});
