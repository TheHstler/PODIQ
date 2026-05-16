/* ─────────────────────────────────────────────────────────────────────────────
   RSSPage.jsx
   A page that lets the user paste any podcast RSS feed URL, fetches and parses
   it, then shows the podcast info and a playable episode list.  All navigation
   to the player passes the full episode object via React Router location.state
   so the player can use RSS data without it being in the hardcoded episodes.js.
───────────────────────────────────────────────────────────────────────────── */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { parseRSSFeed } from "../utils/rssParser";

/* ── HELPER: formatDate ─────────────────────────────────────────────────────
   Converts an RFC 2822 date string (e.g. "Mon, 12 May 2025 10:00:00 +0000")
   into a friendly human-readable form like "12 May 2025".
   Returns the original string if parsing fails so nothing is lost.         */
function formatDate(pubDateStr) {
  if (!pubDateStr) return "";
  const date = new Date(pubDateStr);
  if (isNaN(date.getTime())) return pubDateStr;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ── HELPER: formatDuration ─────────────────────────────────────────────────
   RSS duration can arrive as "HH:MM:SS", "MM:SS", or raw seconds.
   This normalises all three into a concise "Xh Xm" label for display.     */
function formatDuration(raw) {
  if (!raw) return "";

  /* If it already contains colons it is already in time format — return as-is */
  if (String(raw).includes(":")) return raw;

  /* Otherwise it is raw seconds — convert to hours and minutes */
  const totalSeconds = parseInt(raw, 10);
  if (isNaN(totalSeconds)) return raw;
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

/* ──────────────────────────────────────────────────────────────────────────
   RSSPage Component
   ────────────────────────────────────────────────────────────────────────── */
function RSSPage() {
  const navigate = useNavigate();

  /* useLocation gives us the current URL, including the search string (?url=...) */
  const location = useLocation();

  /* The URL the user has typed into the input field */
  const [inputUrl, setInputUrl] = useState("");

  /* While fetch/parse is running we show a loading indicator */
  const [loading, setLoading] = useState(false);

  /* If something goes wrong we store the message here and display it */
  const [error, setError] = useState("");

  /* Once the feed loads successfully, channel holds the podcast metadata */
  const [channel, setChannel] = useState(null);

  /* episodes holds the array of parsed episode objects from the feed */
  const [episodes, setEpisodes] = useState([]);

  /* ── loadFeed ─────────────────────────────────────────────────────────────
     Core loading function.  Accepts the feed URL as a direct argument so it
     can be called from the useEffect without any dependency on inputUrl state.
     The URL always arrives via the ?url= query param — never from a typed
     input on this page.                                                     */
  async function loadFeed(url) {
    const trimmedUrl = url.trim();

    /* Basic guard — ensure there is actually something to fetch */
    if (!trimmedUrl) {
      setError("Please enter an RSS feed URL.");
      return;
    }

    /* Reset previous results and any existing error before each new fetch */
    setError("");
    setChannel(null);
    setEpisodes([]);
    setLoading(true);

    try {
      /* parseRSSFeed returns { channel, episodes } — destructure both */
      const result = await parseRSSFeed(trimmedUrl);
      setChannel(result.channel);
      setEpisodes(result.episodes);
    } catch (err) {
      /* Show the error message from the parser to the user */
      console.error("[RSSPage] Load error:", err);
      setError(err.message || "Something went wrong loading the feed.");
    } finally {
      /* Always turn the spinner off whether the fetch succeeded or failed */
      setLoading(false);
    }
  }

  /* ── useEffect: auto-load from query param ───────────────────────────────
     When this page is opened with a ?url= query parameter — for example
     /rss?url=https://feeds.megaphone.fm/darknetdiaries — we want to:
       1. Pre-fill the visible input field with that URL so the user can see
          what was loaded (or edit it to try a different feed)
       2. Immediately trigger the fetch so the page loads without any clicks

     The empty dependency array [] means this effect runs exactly once, right
     after the component first mounts.  We don't need it to re-run on every
     render — we only want to act on the URL that was present at page load.  */
  useEffect(() => {
    /* URLSearchParams parses the query string, e.g. "?url=https://..." into
       a map of key/value pairs we can read with .get()                      */
    const params = new URLSearchParams(location.search);
    const urlParam = params.get("url");

    /* Only proceed if a non-empty url param is actually present */
    if (urlParam && urlParam.trim()) {
      /* Update the visible input field so the user can see (and edit) the URL */
      setInputUrl(urlParam.trim());

      /* Trigger the fetch immediately — pass the param value directly to
         loadFeed rather than relying on inputUrl state, because the
         setInputUrl call above is asynchronous and inputUrl would still
         be empty if we tried to read it right here.                         */
      loadFeed(urlParam.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    /* loadFeed is intentionally omitted from deps — we only want this to
       run once on mount, not every time the component re-renders.          */
  }, []);

  /* ── handlePlay ───────────────────────────────────────────────────────────
     Navigates to the player page for a specific episode.
     The full episode object is passed as location.state so PlayerPage can
     use the RSS data directly without it being in episodes.js.
     The URL uses encodeURIComponent(guid) as the :id segment — it does not
     need to be a number since PlayerPage will read from state first.       */
  function handlePlay(episode) {
    navigate(`/player/${encodeURIComponent(episode.guid)}`, {
      state: { episode },
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#f5f0e8" }}>

      {/* ── TOP NAV ── */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1.25rem 2.5rem",
        borderBottom: "1px solid #1e1e3a",
        background: "#0d0d1a",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        {/* Brand — clicking takes you back to the home episode list */}
        <span
          onClick={() => navigate("/")}
          style={{
            fontSize: "1.4rem",
            fontWeight: "bold",
            letterSpacing: "0.05em",
            color: "#e8ff47",
            fontFamily: "Georgia, serif",
            cursor: "pointer",
          }}
        >
          POD<span style={{ color: "#fff" }}>PLAYER</span>
        </span>

        {/* Back link to the main episode list */}
        <button
          onClick={() => navigate("/")}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#aaaacc",
            padding: "0.4rem 1.1rem",
            borderRadius: "20px",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          ← All Episodes
        </button>
      </nav>

      {/* ── LOADING INDICATOR ─────────────────────────────────────────────────
           Only visible while the CORS fetch + XML parse is in progress.
           Centred vertically in the page with plenty of breathing room.    */}
      {loading && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "5rem 2rem",
        }}>
          {/* CSS spinner — a rotating ring using the border-trick */}
          <div style={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            border: "2px solid rgba(232,255,71,0.2)",
            borderTopColor: "#e8ff47",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{ color: "#5a5a9a", fontSize: "0.9rem" }}>
            Fetching and parsing feed…
          </span>
        </div>
      )}

      {/* ── ERROR MESSAGE ──────────────────────────────────────────────────────
           Shown when the fetch or XML parse failed.  Centred with the same
           horizontal constraints used for the results section below.       */}
      {error && (
        <div style={{
          maxWidth: "620px",
          margin: "3rem auto 0",
          padding: "0 2rem",
        }}>
          <div style={{
            padding: "1rem 1.5rem",
            background: "rgba(255,80,80,0.08)",
            border: "1px solid rgba(255,80,80,0.25)",
            borderRadius: "12px",
            color: "#ff8080",
            fontSize: "0.9rem",
            lineHeight: 1.5,
          }}>
            <strong>Could not load feed</strong>
            <br />
            {error}
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ────────────────────────────────────────────────────────
           Shown on first visit when no ?url= param was supplied, or if the
           param was empty.  Guides the user back to the home page where the
           RSS input lives.  Not shown while loading or after an error.     */}
      {!loading && !channel && !error && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "6rem 2rem",
          gap: "1rem",
        }}>
          {/* Microphone icon gives the empty state some visual weight */}
          <div style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.9rem",
            marginBottom: "0.25rem",
          }}>
            🎙️
          </div>

          {/* Heading */}
          <h2 style={{
            fontSize: "1.25rem",
            fontFamily: "Georgia, serif",
            color: "#f5f0e8",
            fontWeight: "normal",
            margin: 0,
          }}>
            No podcast loaded yet
          </h2>

          {/* Instruction — tells the user exactly where to go and what to do */}
          <p style={{
            color: "#3a3a6a",
            fontSize: "0.95rem",
            maxWidth: "360px",
            lineHeight: 1.7,
            margin: 0,
          }}>
            Paste a podcast RSS URL on the home page to load episodes here.
          </p>

          {/* Button pointing back to the home page where the RSS input is */}
          <button
            onClick={() => navigate("/")}
            style={{
              marginTop: "0.5rem",
              background: "transparent",
              border: "1px solid rgba(232,255,71,0.25)",
              color: "#e8ff47",
              padding: "0.6rem 1.5rem",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "0.85rem",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(232,255,71,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(232,255,71,0.25)")}
          >
            ← Go to Home
          </button>
        </div>
      )}

      {/* ── RESULTS SECTION — only shown once a feed has loaded ── */}
      {channel && (
        <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 2rem 5rem" }}>

          {/* ── CHANNEL / PODCAST INFO CARD ── */}
          <div style={{
            display: "flex",
            gap: "1.5rem",
            alignItems: "flex-start",
            padding: "1.75rem",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "16px",
            marginBottom: "2.5rem",
            flexWrap: "wrap",
          }}>
            {/* Podcast channel artwork */}
            {channel.image && (
              <img
                src={channel.image}
                alt={channel.title}
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "12px",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            )}

            {/* Channel name and description */}
            <div style={{ flex: 1, minWidth: "200px" }}>
              {/* Small label above the title */}
              <p style={{
                color: "#e8ff47",
                fontSize: "0.7rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "0.4rem",
              }}>
                Now Loaded
              </p>

              {/* Podcast title */}
              <h2 style={{
                fontSize: "1.4rem",
                fontFamily: "Georgia, serif",
                color: "#f5f0e8",
                marginBottom: "0.5rem",
                fontWeight: "normal",
              }}>
                {channel.title}
              </h2>

              {/* Episode count badge */}
              <p style={{ color: "#5a5a9a", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                {episodes.length} episode{episodes.length !== 1 ? "s" : ""}
              </p>

              {/* Channel description — truncated to keep the card compact */}
              {channel.description && (
                <p style={{
                  color: "#3a3a6a",
                  fontSize: "0.85rem",
                  lineHeight: 1.5,
                  /* Show at most 3 lines then clip */
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {channel.description}
                </p>
              )}
            </div>
          </div>

          {/* ── EPISODE LIST SECTION LABEL ── */}
          <p style={{
            color: "#3a3a6a",
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "1rem",
          }}>
            Episodes
          </p>

          {/* ── EPISODE CARDS — same visual style as EpisodeList ── */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "1px",          /* gap between cards acts as a divider line */
            background: "#1a1a3a",
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid #1a1a3a",
          }}>
            {episodes.map((ep, index) => (
              <div
                key={ep.guid || index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem",
                  padding: "1.25rem 1.5rem",
                  background: "#0d0d1a",
                  cursor: "pointer",
                  borderTop: index === 0 ? "none" : "1px solid #1a1a3a",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#111128")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#0d0d1a")}
              >
                {/* Episode number — padded to two digits e.g. 01, 02 */}
                <span style={{
                  color: "#2a2a5a",
                  fontSize: "0.8rem",
                  fontFamily: "monospace",
                  minWidth: "28px",
                  flexShrink: 0,
                }}>
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/* Episode thumbnail — falls back to channel art */}
                <img
                  src={ep.image || channel.image || ""}
                  alt={ep.title}
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "8px",
                    objectFit: "cover",
                    flexShrink: 0,
                    /* Hide broken image icon if URL is missing */
                    display: (ep.image || channel.image) ? "block" : "none",
                  }}
                />

                {/* Title, date and duration */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{
                    fontSize: "0.95rem",
                    color: "#f5f0e8",
                    marginBottom: "0.3rem",
                    fontFamily: "Georgia, serif",
                    fontWeight: "normal",
                    /* Clip long titles with an ellipsis */
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {ep.title}
                  </h2>

                  {/* Date and duration on the same row, separated by a dot */}
                  <p style={{ color: "#3a3a6a", fontSize: "0.8rem" }}>
                    {formatDate(ep.pubDate)}
                    {ep.pubDate && ep.duration ? " · " : ""}
                    {formatDuration(ep.duration)}
                  </p>
                </div>

                {/* Play button — navigates to /player/:guid with episode state */}
                <button
                  onClick={() => handlePlay(ep)}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "transparent",
                    border: "1px solid #2a2a5a",
                    color: "#e8ff47",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(232,255,71,0.12)";
                    e.currentTarget.style.borderColor = "#e8ff47";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "#2a2a5a";
                  }}
                  aria-label={`Play ${ep.title}`}
                >
                  ▶
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p style={{ color: "#1e1e3a", fontSize: "0.75rem", textAlign: "center", marginTop: "3rem" }}>
            © 2025 PodPlayer
          </p>
        </div>
      )}

      {/* ── SPINNER KEYFRAMES — injected as a style tag ─────────────────────
          Using a <style> tag is the simplest way to define a CSS animation
          in a React component that uses only inline styles.                */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default RSSPage;
