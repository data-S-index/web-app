export default defineEventHandler((event) => {
  console.log(`[${new Date().toISOString()}] New request: ${event.node.req.url}`);
});
