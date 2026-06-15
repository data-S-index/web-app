const BLOCKED_USER_AGENTS = [
  "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
];

export default defineEventHandler((event) => {
  const ua = event.node.req.headers["user-agent"] ?? "";

  if (BLOCKED_USER_AGENTS.some((blocked) => ua.includes(blocked))) {
    sendNoContent(event, 204);
  }
});
