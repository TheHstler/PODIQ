import { useNavigate } from "react-router-dom";
import { useState } from "react";

/* ── FEATURED PODCASTS ───────────────────────────────────────────────────────
   These are the example podcasts shown on the homepage as large tiles.
   Clicking one loads its episodes on the RSS page.                        */
const FEATURED_PODCASTS = [
  {
    title: "Freakonomics Radio",
    description:
      "Surprising and counterintuitive stories about economics and human behaviour.",
    rssUrl: "https://feeds.simplecast.com/Y8lFbOT4",
    /* Using picsum as reliable placeholder — replace with real artwork later */
    image: "https://picsum.photos/seed/freakonomics/600/400",
    color: "#1a3a2a",
  },
  {
    title: "Darknet Diaries",
    description:
      "True stories from the dark side of the internet — hacking, cybercrime and espionage.",
    rssUrl: "https://feeds.megaphone.fm/darknetdiaries",
    image: "https://picsum.photos/seed/darknet/600/400",
    color: "#1a1a3a",
  },
  {
    title: "The Daily",
    description:
      "The biggest stories of our time, told by the journalists who cover them.",
    rssUrl: "https://feeds.simplecast.com/54nAGcIl",
    image: "https://picsum.photos/seed/thedaily/600/400",
    color: "#2a1a1a",
  },
  {
    title: "How I Built This",
    description:
      "Guy Raz dives into the stories behind some of the world's best known companies.",
    rssUrl: "https://feeds.npr.org/510313/podcast.xml",
    image: "https://picsum.photos/seed/howIbuilt/600/400",
    color: "#2a2a1a",
  },
];

function EpisodeList() {
  const navigate = useNavigate();
  const [rssUrl, setRssUrl] = useState("");

  /* ── HANDLE RSS URL INPUT ────────────────────────────────────────────────
     When user pastes a URL and clicks Load or presses Enter, navigate
     to the RSS page with the URL as a query parameter.                   */
  function handleLoadUrl() {
    if (rssUrl.trim()) {
      navigate(`/rss?url=${encodeURIComponent(rssUrl.trim())}`);
    }
  }

  /* ── HANDLE FEATURED PODCAST CLICK ──────────────────────────────────────
     Clicking a featured tile navigates to the RSS page with that
     podcast's feed URL — same flow as pasting a URL manually.           */
  function handleFeaturedClick(feedUrl) {
    navigate(`/rss?url=${encodeURIComponent(feedUrl)}`);
  }

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
      </nav>

      {/* ── HERO SECTION ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "5rem 2rem 3.5rem",
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

        {/* Tagline */}
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

        {/* ── RSS URL INPUT ─────────────────────────────────────────────────
            User can paste any podcast RSS URL here to load it.           */}
        <div
          style={{
            width: "100%",
            maxWidth: "560px",
            display: "flex",
            gap: "0.5rem",
          }}
        >
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
              /* pressing Enter triggers load */
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLoadUrl();
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
          <button
            onClick={handleLoadUrl}
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
      </div>

      {/* ── FEATURED PODCASTS GRID ── */}
      <div
        style={{ maxWidth: "960px", margin: "0 auto", padding: "0 2rem 4rem" }}
      >
        {/* Section heading */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p
            style={{
              color: "#e8ff47",
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: "0.4rem",
            }}
          >
            Featured Podcasts
          </p>
          <p style={{ color: "#3a3a6a", fontSize: "0.85rem" }}>
            Click any show to browse its episodes
          </p>
        </div>

        {/* Magazine grid — 2 columns on wide, 1 on narrow */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "1rem",
          }}
        >
          {FEATURED_PODCASTS.map((podcast, index) => (
            <div
              key={index}
              onClick={() => handleFeaturedClick(podcast.rssUrl)}
              style={{
                position: "relative",
                borderRadius: "16px",
                overflow: "hidden",
                cursor: "pointer",
                /* Each card is tall like a magazine tile */
                height: "220px",
                background: podcast.color,
                border: "1px solid rgba(255,255,255,0.06)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Background artwork image — darkened */}
              <img
                src={podcast.image}
                alt={podcast.title}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.35 /* dark overlay effect */,
                }}
              />

              {/* Gradient overlay so text is readable */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "70%",
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
                }}
              />

              {/* Card text */}
              <div
                style={{
                  position: "absolute",
                  bottom: "1.25rem",
                  left: "1.25rem",
                  right: "1.25rem",
                }}
              >
                <h3
                  style={{
                    color: "#ffffff",
                    fontSize: "1.1rem",
                    fontFamily: "Georgia, serif",
                    fontWeight: "normal",
                    marginBottom: "0.4rem",
                    textShadow: "0 1px 10px rgba(0,0,0,0.8)",
                  }}
                >
                  {podcast.title}
                </h3>
                <p
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "0.8rem",
                    lineHeight: 1.4,
                    /* clamp to 2 lines */
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {podcast.description}
                </p>
              </div>

              {/* Play arrow in top right corner */}
              <div
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "rgba(232,255,71,0.15)",
                  border: "1px solid rgba(232,255,71,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#e8ff47",
                  fontSize: "0.7rem",
                }}
              >
                ▶
              </div>
            </div>
          ))}
        </div>

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
