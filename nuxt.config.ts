// https://nuxt.com/docs/api/configuration/nuxt-config

// Update these after running `pnpm scripts:generate:sitemaps` and uploading
// the output to cdn.scholardata.io/sitemaps/
const DATASET_SITEMAP_CHUNKS = 1407;
const USER_SITEMAP_CHUNKS = 82;
const ORG_SITEMAP_CHUNKS = 5;

function cdnIndex(prefix: string, chunks: number) {
  return Array.from({ length: chunks }, (_, i) => ({
    sitemap: `https://cdn.scholardata.io/sitemaps/${prefix}-${i}.xml`,
  }));
}

const sitemapIndex = [
  ...cdnIndex("datasets", DATASET_SITEMAP_CHUNKS),
  ...cdnIndex("users", USER_SITEMAP_CHUNKS),
  ...cdnIndex("orgs", ORG_SITEMAP_CHUNKS),
];

// Flip to true before doing risky database work, then back to false when done.
// Blocks the "add dataset" flow and auth (login/signup/forgot/reset password).
const MAINTENANCE_MODE = false;

export default defineNuxtConfig({
  compatibilityDate: "2025-01-16",
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  dayjs: {
    defaultLocale: "en",
    defaultTimezone: "America/Los_Angeles",
    plugins: ["relativeTime", "utc", "timezone"],
  },
  modules: [
    "@nuxt/ui",
    "nuxt-auth-utils",
    "dayjs-nuxt",
    "@nuxt/eslint",
    "@nuxt/image",
    "nuxt-og-image",
    "nuxt-echarts",
    "@nuxtjs/robots",
    "@nuxtjs/sitemap",
    // Must load after @nuxtjs/sitemap so its content-collection integration
    // (sitemap: false frontmatter, etc.) registers correctly.
    "@nuxt/content",
    "nuxt-schema-org",
    "nuxt-link-checker",
  ],
  runtimeConfig: {
    public: {
      baseUrl: process.env.NUXT_SITE_URL,
      environment: process.env.NUXT_SITE_ENV,
      maintenanceMode: MAINTENANCE_MODE,
    },
  },
  eslint: {},
  echarts: {
    charts: ["BarChart", "PieChart", "LineChart"],
    components: [
      "DatasetComponent",
      "GridComponent",
      "TooltipComponent",
      "ToolboxComponent",
      "TitleComponent",
      "LegendComponent",
    ],
  },
  image: {
    // Options
  },
  site: {
    url: process.env.NUXT_SITE_URL,
    name: "Scholar Data",
  },
  linkChecker: {
    failOnError: true,
  },
  sitemap: {
    sitemapsPathPrefix: "/",
    sitemaps: {
      pages: {
        includeAppSources: true,
        exclude: ["/au/**", "/ao/**", "/datasets/**", "/users/**", "/embed/**"],
        defaults: { changefreq: "monthly", priority: 0.7 },
      },
      ...(sitemapIndex.length > 0 && { index: sitemapIndex }),
    },
  },
  robots: {
    groups: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/profile",
          "/embed/",
          "/fuji",
          // Placeholder/example post — content/announcements/00.test.md
          "/announcements/test",
        ],
        contentUsage: {
          bots: "y",
          "train-ai": "n",
          "ai-output": "n",
          search: "y",
        },
        contentSignal: {
          search: "yes",
          "ai-input": "no",
          "ai-train": "no",
        },
      },
    ],
  },
});
