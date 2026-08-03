import * as BunnySDK from "npm:@bunny.net/edgescript-sdk@0.12.1";

const BLOCKED_PATH_PREFIX = "/user-dataset-backup/";

/**
 * Returns a 404 response for any request targeting the user-dataset-backup
 * folder, otherwise passes the request through unchanged.
 *
 * @param {Context} context - The context of the middleware.
 * @param {Request} context.request - The current request.
 */
function blockUserDatasetBackup(context: { request: Request }): Request | Response {
  const { pathname } = new URL(context.request.url);

  if (pathname.startsWith(BLOCKED_PATH_PREFIX)) {
    return new Response("Not Found", { status: 404 });
  }

  return context.request;
}

/**
 * Runs before the cache lookup (only invoked if the Pull Zone has "Run
 * script before cache" enabled). Blocks the folder even on a cache hit.
 *
 * @param {Context} context - The context of the middleware.
 * @param {Request} context.request - The current request.
 */
async function onClientRequest(context: { request: Request }): Promise<Request | Response> {
  return blockUserDatasetBackup(context);
}

/**
 * Runs before the request reaches the origin on a cache miss.
 *
 * @param {Context} context - The context of the middleware.
 * @param {Request} context.request - The current request.
 */
async function onOriginRequest(context: { request: Request }): Promise<Request | Response> {
  return blockUserDatasetBackup(context);
}

BunnySDK.net.http.servePullZone()
  .onClientRequest(onClientRequest)
  .onOriginRequest(onOriginRequest);
