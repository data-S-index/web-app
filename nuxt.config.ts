// https://nuxt.com/docs/api/configuration/nuxt-config
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
    "nuxt-schema-org",
    "nuxt-link-checker",
  ],
  runtimeConfig: {
    public: {
      baseUrl: process.env.NUXT_SITE_URL,
      environment: process.env.NUXT_SITE_ENV,
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
