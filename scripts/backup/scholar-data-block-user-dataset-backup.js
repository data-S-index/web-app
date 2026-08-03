import * as BunnySDK from "npm:@bunny.net/edgescript-sdk@0.12.1";

const BLOCKED_PATH_PREFIX = "/user-dataset-backup/";
const NOT_FOUND_URL = "https://cdn.scholardata.io/404";

/**
 * Redirects any request targeting the user-dataset-backup folder to the
 * site's 404 page, otherwise passes the request through unchanged.
 *
 * @param {{ request: Request }} context - The context of the middleware.
 */
function blockUserDatasetBackup(context) {
  const { url } = context.request;

  if (url.includes(BLOCKED_PATH_PREFIX)) {
    return Response.redirect(NOT_FOUND_URL, 302);
  }

  return context.request;
}

/**
 * Runs before the request reaches the origin on a cache miss.
 *
 * @param {{ request: Request }} context - The context of the middleware.
 */
async function onOriginRequest(context) {
  return blockUserDatasetBackup(context);
}

BunnySDK.net.http.servePullZone().onOriginRequest(onOriginRequest);
