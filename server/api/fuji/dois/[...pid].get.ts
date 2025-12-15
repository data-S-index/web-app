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

  console.log(`PID ${pid} not found in cache, fetching from DataCite`);

  try {
    // If not in cache, fetch the PID from the DataCite API
    const response = await fetch(`https://api.datacite.org/dois/${pid}`, {
      headers: {
        "User-Agent": "ssoundarajan@calmi2.org",
        Accept: "application/json",
      },
    });

    // Only treat as existing if DataCite returns a successful response
    if (!response.ok) {
      // DataCite returns 404 when the DOI does not exist
      if (response.status === 404) {
        setResponseStatus(event, 404);

        return { exists: false, message: "DOI not found" };
      }

      // For any other error from DataCite, surface a generic server error
      console.error(
        `Error from DataCite for PID ${pid}: status ${response.status}`,
      );
      setResponseStatus(event, 502);

      return { exists: false, message: "Error querying DataCite" };
    }

    const data = await response.json().catch((error) => {
      console.error(`Failed to parse DataCite response for PID ${pid}`, error);

      return null;
    });

    // If DataCite didn't return a usable body, treat as not found
    if (!data) {
      setResponseStatus(event, 404);

      return { exists: false, message: "DOI not found" };
    }

    // Cache the PID for 3 months only when DataCite confirms it exists
    console.log(`Caching PID ${pid} for 3 months`);
    await useStorage().setItem(`fuji:datacite-doi:${pid}`, "exists", {
      maxAge: 60 * 60 * 24 * 30 * 3,
    });

    setResponseStatus(event, 200);

    return { exists: true };
  } catch (error) {
    console.error(
      `Unexpected error while querying DataCite for PID ${pid}`,
      error,
    );
    setResponseStatus(event, 502);

    return { exists: false, message: "Error querying DataCite" };
  }
});
