// Lets external workflows check whether the site is in maintenance mode
// (see MAINTENANCE_MODE in nuxt.config.ts) before writing any data.

export default defineEventHandler((event) => {
  const { maintenanceMode } = useRuntimeConfig().public;

  setHeader(event, "Cache-Control", "no-store");

  return { maintenanceMode: Boolean(maintenanceMode) };
});
