/**
 * Get the client's IP address, accounting for proxies/load balancers
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getClientIp(event: any): string {
  const { headers } = event.node.req;
  const forwardedFor = headers["x-forwarded-for"];
  const realIp = headers["x-real-ip"];
  const remoteAddress = event.node.req.socket?.remoteAddress;

  let ip = "";
  if (forwardedFor) {
    ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(",")[0].trim();
  } else if (realIp) {
    ip = Array.isArray(realIp) ? realIp[0] : realIp;
  } else if (remoteAddress) {
    ip = remoteAddress;
  }

  return ip || "unknown";
}
