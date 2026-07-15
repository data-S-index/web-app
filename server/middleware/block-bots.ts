const BLOCKED_USER_AGENTS = [
  "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
  "ClaudeBot/1.0",
  "GPTBot/1.4",
];

export default defineEventHandler((event) => {
  const ua = event.node.req.headers["user-agent"] ?? "";

  if (BLOCKED_USER_AGENTS.some((blocked) => ua.includes(blocked))) {
    sendNoContent(event, 204);
  }
});
