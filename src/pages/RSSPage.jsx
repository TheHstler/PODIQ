/* ─────────────────────────────────────────────────────────────────────────────
   RSSPage.jsx
   A page that lets the user paste any podcast RSS feed URL, fetches and parses
   it, then shows the podcast info and a playable episode list.  All navigation
   to the player passes the full episode object via React Router location.state
   so the player can use RSS data without it being in the hardcoded episodes.js.
───────────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  /* ── handleLoad ───────────────────────────────────────────────────────────
     Called when the user clicks "Load Podcast" or presses Enter.
     Validates the input, calls parseRSSFeed, and updates state.           */
  async function handleLoad() {
    const trimmedUrl = inputUrl.trim();

    /* Basic guard — ensure the user actually typed something */
    if (!trimmedUrl) {
      setError("Please enter an RSS feed URL.");
      return;
    }

    /* Reset previous results and error before each new fetch */
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
      /* Always turn the spinner off whether it succeeded or failed */
      setLoading(false);
    }
  }

  /* ── handleKeyDown ────────────────────────────────────────────────────────
     Allows the user to press Enter in the input field instead of clicking
     the button — a standard UX pattern for search/load inputs.            */
  function handleKeyDown(e) {
    if (e.key === "Enter") handleLoad();
  }

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

      {/* ── HERO / INPUT SECTION ── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "4rem 2rem 3rem",
        background: "radial-gradient(ellipse at 50% 0%, #1a1a4a 0%, #0d0d1a 70%)",
      }}>
        {/* Page heading */}
        <h1 style={{
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          fontFamily: "Georgia, serif",
          fontWeight: "bold",
          color: "#ffffff",
          marginBottom: "0.5rem",
          lineHeight: 1.1,
        }}>
          Load a <span style={{ color: "#e8ff47" }}>Podcast</span>
        </h1>

        {/* Subtitle explaining what to do */}
        <p style={{
          color: "#5a5a9a",
          fontSize: "1rem",
          maxWidth: "480px",
          marginBottom: "2.5rem",
          lineHeight: 1.6,
        }}>
          Paste any podcast RSS feed URL below to browse and play its episodes.
        </p>

        {/* ── URL INPUT + LOAD BUTTON ── */}
        <div style={{
          display: "flex",
          gap: "0.75rem",
          width: "100%",
          maxWidth: "620px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          {/* The text input where the user pastes the RSS feed URL */}
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://feeds.megaphone.fm/darknetdiaries"
            disabled={loading}
            style={{
              flex: 1,
              minWidth: "280px",
              padding: "0.9rem 1.25rem",
              background: "#12122a",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "50px",
              color: "#f5f0e8",
              fontSize: "0.95rem",
              fontFamily: "Georgia, serif",
              outline: "none",
              /* Dim the input while loading to signal it is not interactive */
              opacity: loading ? 0.6 : 1,
              transition: "border-color 0.2s",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(232,255,71,0.4)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
          />

          {/* Load button — lime accent to match the app style */}
          <button
            onClick={handleLoad}
            disabled={loading}
            style={{
              padding: "0.9rem 2rem",
              background: loading ? "#3a3a1a" : "#e8ff47",
              color: loading ? "#666" : "#0d0d1a",
              border: "none",
              borderRadius: "50px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "0.95rem",
              fontWeight: "bold",
              flexShrink: 0,
              transition: "background 0.2s, transform 0.1s",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "scale(1.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {/* Change button text to indicate activity while loading */}
            {loading ? "Loading…" : "Load Podcast"}
          </button>
        </div>

        {/* ── LOADING INDICATOR ── */}
        {loading && (
          <div style={{ marginTop: "2rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* CSS spinner — a rotating circle using border-trick */}
            <div style={{
              width: "20px",
              height: "20px",
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

        {/* ── ERROR MESSAGE ── */}
        {error && (
          <div style={{
            marginTop: "1.5rem",
            maxWidth: "560px",
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
        )}
      </div>

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
