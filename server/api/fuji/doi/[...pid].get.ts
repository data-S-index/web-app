export default defineEventHandler(async (event) => {
  const { pid } = event.context.params as { pid: string };
  console.log("pid", pid);

  if (!pid) {
    setResponseStatus(event, 400);

    return { exists: false };
  }

  // Check the cache for the PID
  const value = await useStorage().getItem(`fuji:datacite-doi:${pid}`);

  if (value) {
    console.log(`PID ${pid} found in cache`, value);
    setResponseStatus(event, 200);

    return { exists: true };
  }

  // If not in cache, fetch the PID from the API
  const response = await fetch(`https://api.datacite.org/dois/${pid}`, {
    headers: {
      "User-Agent": "ssoundarajan@calmi2.org",
      Accept: "application/json",
    },
  });
  console.log(`PID ${pid} not found in cache, fetching from API`);
  const res = await response
    .json()
    .then(async (_data) => {
      // Cache the PID for 3 months
      console.log(`Caching PID ${pid} for 3 months`);
      await useStorage().setItem(`fuji:datacite-doi:${pid}`, "exists", {
        maxAge: 60 * 60 * 24 * 30 * 3,
      });

      return { data: { exists: true }, status: 200 };
    })
    .catch((error) => {
      console.error(error);

      return { data: { exists: false, message: "DOI not found" }, status: 404 };
    });

  setResponseStatus(event, res.status);

  return res.data;
});
