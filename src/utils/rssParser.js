/* ─────────────────────────────────────────────────────────────────────────────
   rssParser.js
   Utility that fetches a podcast RSS feed URL, parses the XML, and returns
   structured episode data.  Uses a CORS proxy because browsers block direct
   cross-origin XML requests, and uses the built-in DOMParser so no extra
   libraries are needed.
───────────────────────────────────────────────────────────────────────────── */

/* The allorigins.win proxy accepts any URL and re-serves the response with
   CORS headers, allowing the browser to read it.  The response JSON shape is:
     { contents: "<raw xml string>", status: { http_code, ... } }          */
// const CORS_PROXY = "https://api.allorigins.win/get?url=";
/* ── HELPER: fetchWithProxy ─────────────────────────────────────────────────
   Tries multiple CORS proxies in order until one returns valid XML.
   This is necessary because free proxies are unreliable — if one is down
   the next one in the list will be attempted automatically.                */
async function fetchWithProxy(url) {
  /* Each proxy handles the response differently — we note which type each is */
  const proxies = [
    {
      /* corsproxy.io returns raw XML directly */
      url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
      type: "raw",
    },
    {
      /* allorigins wraps the XML inside a JSON envelope: { contents: "..." } */
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      type: "allorigins",
    },
    {
      /* codetabs returns raw XML directly */
      url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      type: "raw",
    },
  ];

  /* Try each proxy one at a time */
  for (const proxy of proxies) {
    try {
      console.log("[rssParser] Trying proxy:", proxy.url);
      const response = await fetch(proxy.url);

      if (!response.ok) {
        /* This proxy returned a bad HTTP status — skip to the next one */
        console.warn(
          "[rssParser] Proxy returned HTTP",
          response.status,
          "— trying next",
        );
        continue;
      }

      let text;

      if (proxy.type === "allorigins") {
        /* allorigins wraps content in JSON so we parse that first */
        const json = await response.json();
        text = json.contents;
      } else {
        /* Other proxies return raw XML we can use directly */
        text = await response.text();
      }

      /* Check we actually got XML back and not an error page */
      if (text && text.includes("<rss")) {
        console.log("[rssParser] Success with proxy:", proxy.url);
        return text;
      }

      console.warn("[rssParser] Proxy returned non-RSS content — trying next");
    } catch (err) {
      /* Network error with this proxy — move on to the next */
      console.warn("[rssParser] Proxy failed:", proxy.url, err.message);
    }
  }

  /* Every proxy failed */
  throw new Error(
    "All proxies failed. Check the feed URL is correct and try again.",
  );
}

/* ── HELPER: getText ────────────────────────────────────────────────────────
   Safely gets the text content of the first matching element inside a parent.
   Returns an empty string instead of throwing if the element is missing.   */
function getText(parent, tagName) {
  const el = parent.getElementsByTagName(tagName)[0];
  return el ? (el.textContent || "").trim() : "";
}

/* ── HELPER: getItunesField ─────────────────────────────────────────────────
   Tries two strategies to read itunes-namespaced tags:
   1. getElementsByTagName("itunes:fieldName") — works in most environments
   2. getElementsByTagNameNS with the official iTunes podcast DTD namespace
      — fallback for stricter namespace-aware parsers                       */
function getItunesField(parent, fieldName) {
  /* Strategy 1: simple tag name lookup (most browsers) */
  const byTag = parent.getElementsByTagName("itunes:" + fieldName)[0];
  if (byTag) return byTag;

  /* Strategy 2: explicit namespace URI lookup */
  const byNS = parent.getElementsByTagNameNS(
    "http://www.itunes.com/dtds/podcast-1.0.dtd",
    fieldName,
  )[0];
  return byNS || null;
}

/* ── HELPER: stripHtml ──────────────────────────────────────────────────────
   Removes HTML markup from a string so descriptions render as plain text.
   Creates a temporary DOM element, assigns the raw HTML, then reads back
   only the text content — the browser does the stripping safely.           */
function stripHtml(rawHtml) {
  if (!rawHtml) return "";
  const temp = document.createElement("div");
  temp.innerHTML = rawHtml;
  return (temp.textContent || temp.innerText || "").trim();
}

/* ── HELPER: extractChannelImage ────────────────────────────────────────────
   Podcast RSS feeds can store the channel image in two places; this checks
   both and returns whichever it finds first.                                */
function extractChannelImage(channel) {
  /* Preferred: <itunes:image href="..."> */
  const itunesImg = getItunesField(channel, "image");
  if (itunesImg && itunesImg.getAttribute("href")) {
    return itunesImg.getAttribute("href");
  }

  /* Fallback: <image><url>...</url></image>  (original RSS spec) */
  const rssImg = channel.getElementsByTagName("image")[0];
  if (rssImg) {
    return getText(rssImg, "url");
  }

  return "";
}

/* ── HELPER: extractItemImage ───────────────────────────────────────────────
   Each episode <item> may have its own artwork.  If not, fall back to the
   channel-level image so every episode always has something to display.    */
function extractItemImage(item, channelImageUrl) {
  const itunesImg = getItunesField(item, "image");
  if (itunesImg && itunesImg.getAttribute("href")) {
    return itunesImg.getAttribute("href");
  }
  /* Use the channel artwork as a sensible default */
  return channelImageUrl || "";
}

/* ── MAIN EXPORT: parseRSSFeed ──────────────────────────────────────────────
   Public API: takes any podcast RSS feed URL, returns a Promise that resolves
   to { channel, episodes }.

   channel shape:  { title, description, image }
   episode shape:  { guid, title, description, audioSrc, pubDate, duration, image }

   Throws (rejects) on network failure or badly malformed XML so the caller
   can show an error message to the user.                                    */
export async function parseRSSFeed(url) {
  /* ── STEP 1: Fetch via CORS proxy ────────────────────────────────────────
     fetchWithProxy() tries multiple proxies automatically so if one is down
     the next one is attempted without the user seeing an error.            */
  let rawXml;
  try {
    rawXml = await fetchWithProxy(url);
  } catch (err) {
    console.error("[rssParser] All proxies failed:", err);
    throw new Error("Could not load feed: " + err.message);
  }

  /* ── STEP 2: Parse the raw XML string into a DOM tree ───────────────────
     DOMParser is built into every modern browser — no library needed.      */
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(rawXml, "application/xml");

  /* DOMParser signals parse errors via a <parsererror> element rather than
     throwing, so we have to check for it explicitly.                       */
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    console.error("[rssParser] XML parse error:", parseError.textContent);
    throw new Error(
      "Failed to parse XML — the URL may not be a valid RSS feed.",
    );
  }

  /* ── STEP 3: Extract the channel (podcast-level) metadata ───────────────
     The <channel> element sits directly inside <rss> and holds the podcast
     name, description, and artwork shared by all episodes.                 */
  const channel = xmlDoc.querySelector("channel");
  if (!channel) {
    throw new Error(
      "No <channel> element found — this does not appear to be an RSS feed.",
    );
  }

  /* Channel title: use the direct child <title>, not titles inside <item>s.
     We get the first text node directly to avoid picking up nested titles. */
  const channelTitleEl = Array.from(channel.childNodes).find(
    (n) => n.nodeName === "title",
  );
  const channelTitle = channelTitleEl
    ? (channelTitleEl.textContent || "").trim()
    : "Untitled Podcast";

  const channelImage = extractChannelImage(channel);

  const channelDescription = stripHtml(getText(channel, "description")) || "";

  const channelInfo = {
    title: channelTitle,
    description: channelDescription,
    image: channelImage,
  };

  /* ── STEP 4: Extract each episode from <item> elements ──────────────────
     Every <item> is one episode.  We map each one to a plain JS object
     with consistent field names so the rest of the app doesn't need to
     know about RSS internals.                                              */
  const items = Array.from(xmlDoc.querySelectorAll("item"));

  const episodes = items.map((item, index) => {
    /* guid — unique stable ID for this episode.  Falls back to the title
       or index so every episode always has some kind of identifier.        */
    const guid =
      getText(item, "guid") || getText(item, "title") || String(index);

    /* title — plain text, HTML stripped just in case */
    const title = stripHtml(getText(item, "title")) || "Untitled Episode";

    /* description — RSS descriptions often contain HTML markup */
    const rawDescription =
      getText(item, "description") ||
      getItunesField(item, "summary")?.textContent ||
      "";
    const description = stripHtml(rawDescription) || "";

    /* audioSrc — the <enclosure> tag holds the MP3/AAC URL in its url attr */
    const enclosure = item.getElementsByTagName("enclosure")[0];
    const audioSrc = enclosure ? enclosure.getAttribute("url") || "" : "";

    /* pubDate — the publication date string as-is from the feed (RFC 2822).
       Consumers can call `new Date(pubDate)` to parse it.                 */
    const pubDate = getText(item, "pubDate") || "";

    /* duration — stored in the itunes namespace, e.g. "45:12" or "2712"   */
    const durationEl = getItunesField(item, "duration");
    const duration = durationEl ? (durationEl.textContent || "").trim() : "";

    /* image — episode artwork, or falls back to channel artwork            */
    const image = extractItemImage(item, channelImage);

    return {
      guid,
      title,
      description,
      audioSrc,
      pubDate,
      duration,
      image,
    };
  });

  console.log(
    `[rssParser] Parsed "${channelInfo.title}" — ${episodes.length} episodes`,
  );

  /* Return both pieces so the UI can display the podcast header separately */
  return { channel: channelInfo, episodes };
}
