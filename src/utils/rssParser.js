/* ─────────────────────────────────────────────────────────────────────────────
   src/utils/rssParser.js
   Fetches and parses a podcast RSS feed by calling our own Express backend
   at localhost:3001. The backend handles the actual RSS fetching server-side
   which completely bypasses CORS restrictions — no dodgy proxies needed.
───────────────────────────────────────────────────────────────────────────── */

/* The URL of our Express backend — it runs separately on port 3001
   while the React app runs on port 3000                                     */
const BACKEND_URL = "http://localhost:3001";

/* ── MAIN EXPORT: parseRSSFeed ──────────────────────────────────────────────
   Takes any podcast RSS feed URL, sends it to our backend, and returns
   a Promise that resolves to { channel, episodes }.

   channel shape:  { title, description, image }
   episode shape:  { guid, title, description, audioSrc, pubDate, duration, image }

   Throws an error if the backend is unreachable or the feed fails to load. */
export async function parseRSSFeed(url) {
  /* ── STEP 1: Ask our backend to fetch and parse the RSS feed ─────────────
     We pass the RSS URL as a query parameter to our /api/feed endpoint.
     The backend fetches it server-to-server (no CORS issues) and returns
     clean structured JSON.                                                  */
  const backendUrl = `${BACKEND_URL}/api/feed?url=${encodeURIComponent(url)}`;

  console.log("[rssParser] Requesting feed from backend:", backendUrl);

  let response;
  try {
    response = await fetch(backendUrl);
  } catch (err) {
    /* This usually means the backend server isn't running */
    console.error("[rssParser] Could not reach backend:", err);
    throw new Error(
      "Could not reach the PodPlayer server. Make sure it is running on port 3001."
    );
  }

  /* ── STEP 2: Check the backend returned a successful response ───────────*/
  if (!response.ok) {
    /* Read the error message from the backend response body */
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || `Server returned HTTP ${response.status}`;
    console.error("[rssParser] Backend error:", message);
    throw new Error(message);
  }

  /* ── STEP 3: Parse the JSON the backend sends back ──────────────────────
     The backend already did all the XML parsing — we just read the result. */
  const data = await response.json();

  console.log(
    `[rssParser] Received ${data.episodes?.length} episodes for "${data.channel?.title}"`
  );

  /* Return in the same shape the rest of the app expects */
  return {
    channel: data.channel,
    episodes: data.episodes,
  };
}