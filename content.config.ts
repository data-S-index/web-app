import { defineContentConfig, defineCollection, z } from "@nuxt/content";

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
        // Note: intentionally not using @nuxtjs/sitemap's `defineSitemapSchema()`
        // helper here - it silently drops the `sitemap` field from the compiled
        // @nuxt/content schema in this dependency combination (likely the
        // duplicate `nuxtseo-shared` versions in the lockfile), which means
        // every announcement gets excluded from the sitemap. A plain schema
        // works fine; set `sitemap: false` in a post's frontmatter to exclude
        // it (e.g. a future placeholder/test post).
        sitemap: z
          .union([z.boolean(), z.object({ loc: z.string().optional() })])
          .optional(),
        // Set to link the post straight to an outside URL (e.g. a press
        // article) instead of rendering the Markdown body on its own page.
        externalUrl: z.string().url().optional(),
      }),
    }),
  },
});
