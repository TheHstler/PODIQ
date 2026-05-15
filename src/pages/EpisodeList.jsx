import { useNavigate } from "react-router-dom";
import { useState } from "react"; 
import episodes from "../data/episodes";

function EpisodeList() {
  const navigate = useNavigate();
  const [rssUrl, setRssUrl] = useState(""); /* tracks what user types in the box */

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a" }}>
      {/* ── TOP NAV ── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 2.5rem",
          borderBottom: "1px solid #1e1e3a",
          background: "#0d0d1a",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Brand name top left */}
        <span
          style={{
            fontSize: "1.4rem",
            fontWeight: "bold",
            letterSpacing: "0.05em",
            color: "#e8ff47",
            fontFamily: "Georgia, serif",
          }}
        >
          POD<span style={{ color: "#fff" }}>PLAYER</span>
        </span>

        {/* Right side of nav: episode count + RSS button side by side */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "#4a4a7a", fontSize: "0.85rem" }}>
            {episodes.length} episodes
          </span>

          {/* Navigates to /rss so the user can load any podcast feed */}
          <button
            onClick={() => navigate("/rss")}
            style={{
              background: "rgba(232,255,71,0.1)",
              border: "1px solid rgba(232,255,71,0.25)",
              color: "#e8ff47",
              padding: "0.4rem 1rem",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: "bold",
              letterSpacing: "0.02em",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(232,255,71,0.18)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(232,255,71,0.1)")
            }
          >
            + Load Podcast from RSS
          </button>
        </div>
      </nav>

      {/* ── HERO SECTION — centred PODPLAYER title, tagline, search ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "5rem 2rem 3.5rem",
          /* indigo radial glow behind the hero text */
          background:
            "radial-gradient(ellipse at 50% 0%, #1a1a4a 0%, #0d0d1a 70%)",
        }}
      >
        {/* Big centred brand name */}
        <h1
          style={{
            fontSize: "clamp(3rem, 8vw, 6rem)",
            fontFamily: "Georgia, serif",
            fontWeight: "bold",
            letterSpacing: "0.08em",
            color: "#e8ff47",
            marginBottom: "0",
            lineHeight: 1,
          }}
        >
          POD<span style={{ color: "#ffffff" }}>PLAYER</span>
        </h1>

        {/* Tagline just below the title */}
        <p
          style={{
            color: "#5a5a9a",
            fontSize: "1rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginTop: "0.75rem",
            marginBottom: "2rem",
          }}
        >
          Listen. Learn. Reflect.
        </p>

        {/* ── RSS URL INPUT ──
    This is the main way to load a podcast — paste any RSS feed URL here.
    Pressing Enter or clicking the button navigates to the RSS page with
    the URL pre-filled so it loads automatically.                          */}
        <div
          style={{
            width: "100%",
            maxWidth: "560px",
            display: "flex",
            gap: "0.5rem",
          }}
        >
          {/* URL input field */}
          <div style={{ position: "relative", flex: 1 }}>
            <span
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#3a3a6a",
                fontSize: "1rem",
                pointerEvents: "none",
              }}
            >
              🎙️
            </span>
            <input
              type="text"
              placeholder="Paste a podcast RSS feed URL..."
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              /* pressing Enter triggers the same action as the button */
              onKeyDown={(e) => {
                if (e.key === "Enter" && rssUrl.trim()) {
                  navigate(`/rss?url=${encodeURIComponent(rssUrl.trim())}`);
                }
              }}
              style={{
                width: "100%",
                padding: "0.9rem 1rem 0.9rem 2.75rem",
                background: "#12122a",
                border: "1px solid #2a2a5a",
                borderRadius: "50px",
                color: "#f5f0e8",
                fontSize: "0.95rem",
                fontFamily: "Georgia, serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Load button */}
          <button
            onClick={() => {
              /* Only navigate if the user actually typed something */
              if (rssUrl.trim()) {
                navigate(`/rss?url=${encodeURIComponent(rssUrl.trim())}`);
              }
            }}
            style={{
              background: "#e8ff47",
              color: "#0d0d1a",
              border: "none",
              padding: "0.9rem 1.5rem",
              borderRadius: "50px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: "bold",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Load →
          </button>
        </div>

        {/* ── RSS LINK — below the search bar, invites users to load any feed ── */}
        <p
          style={{
            marginTop: "1.25rem",
            color: "#3a3a6a",
            fontSize: "0.85rem",
          }}
        >
          Want to listen to another podcast?{" "}
          <span
            onClick={() => navigate("/rss")}
            style={{
              color: "#e8ff47",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            + Load Podcast from RSS
          </span>
        </p>
      </div>

      {/* ── EPISODE LIST ── */}
      <div
        style={{ maxWidth: "860px", margin: "0 auto", padding: "0 2rem 4rem" }}
      >
        {/* Section label above the cards */}
        <p
          style={{
            color: "#3a3a6a",
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "1rem",
          }}
        >
          All Episodes
        </p>

        {/* Cards container — 1px gap gives a "divider line" effect */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1px",
            background: "#1a1a3a",
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid #1a1a3a",
          }}
        >
          {episodes.map((episode, index) => (
            <div
              key={episode.id}
              onClick={() => navigate(`/player/${episode.id}`)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                padding: "1.25rem 1.5rem",
                background: "#0d0d1a",
                cursor: "pointer",
                borderTop: index === 0 ? "none" : "1px solid #1a1a3a",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#111128")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#0d0d1a")
              }
            >
              {/* Episode number e.g. 01, 02, 03 */}
              <span
                style={{
                  color: "#2a2a5a",
                  fontSize: "0.85rem",
                  fontFamily: "monospace",
                  minWidth: "28px",
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              {/* Thumbnail */}
              <img
                src={episode.image}
                alt={episode.title}
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "8px",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />

              {/* Title and description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2
                  style={{
                    fontSize: "1rem",
                    color: "#f5f0e8",
                    marginBottom: "0.3rem",
                    fontFamily: "Georgia, serif",
                    fontWeight: "normal",
                  }}
                >
                  {episode.title}
                </h2>
                <p
                  style={{
                    color: "#3a3a6a",
                    fontSize: "0.85rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow:
                      "ellipsis" /* adds "..." if text is too long */,
                  }}
                >
                  {episode.description}
                </p>
              </div>

              {/* Duration + play circle on the right */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  flexShrink: 0,
                }}
              >
                <span style={{ color: "#2a2a5a", fontSize: "0.8rem" }}>
                  {episode.duration}
                </span>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: "1px solid #2a2a5a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#e8ff47",
                    fontSize: "0.75rem",
                  }}
                >
                  ▶
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p
          style={{
            color: "#1e1e3a",
            fontSize: "0.75rem",
            textAlign: "center",
            marginTop: "3rem",
          }}
        >
          © 2025 PodPlayer
        </p>
      </div>
    </div>
  );
}

export default EpisodeList;
