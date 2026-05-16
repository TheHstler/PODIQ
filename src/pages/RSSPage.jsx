import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { parseRSSFeed } from "../utils/rssParser";

function RSSPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [episodes, setEpisodes] = useState([]);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ── AUTO LOAD FROM URL PARAM ────────────────────────────────────────────
     If a ?url= param exists in the address bar, load that feed
     automatically — this is how homepage search and featured tiles work. */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlParam = params.get("url");
    if (urlParam) {
      loadFeed(urlParam);
    }
  }, [location.search]);

  /* ── LOAD FEED ───────────────────────────────────────────────────────────
     Fetches the RSS feed via our Express backend and updates state.     */
  async function loadFeed(url) {
    setLoading(true);
    setError("");
    setEpisodes([]);
    setChannel(null);

    try {
      const data = await parseRSSFeed(url);
      setChannel(data.channel);
      setEpisodes(data.episodes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ minHeight: "100vh", background: "#f8f7f4", color: "#1a1a2e" }}
    >
      {/* ── TOP NAV ── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 2.5rem",
          background: "#ffffff",
          borderBottom: "1px solid #ebebeb",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <span
          onClick={() => navigate("/")}
          style={{
            fontSize: "1.3rem",
            fontWeight: "700",
            letterSpacing: "0.04em",
            color: "#1a1a2e",
            fontFamily: "Georgia, serif",
            cursor: "pointer",
          }}
        >
          POD<span style={{ color: "#6c47ff" }}>PLAYER</span>
        </span>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none",
            border: "1px solid #e0e0e0",
            color: "#666",
            padding: "0.45rem 1.1rem",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: "500",
          }}
        >
          Back to Home
        </button>
      </nav>

      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "2.5rem 2rem 4rem",
        }}
      >
        {/* ── LOADING STATE ── */}
        {loading && (
          <div style={{ textAlign: "center", padding: "5rem 0" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "3px solid #ebebeb",
                borderTopColor: "#6c47ff",
                margin: "0 auto 1rem",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "#aaa", fontSize: "0.9rem" }}>
              Loading episodes...
            </p>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {error && (
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid #fed7d7",
              borderRadius: "12px",
              padding: "1.25rem 1.5rem",
              color: "#c53030",
            }}
          >
            <p style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
              Could not load feed
            </p>
            <p style={{ fontSize: "0.85rem" }}>{error}</p>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && !error && episodes.length === 0 && (
          <div
            style={{ textAlign: "center", padding: "5rem 0", color: "#aaa" }}
          >
            <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>—</p>
            <p style={{ fontSize: "0.95rem" }}>
              Paste a podcast RSS URL on the home page to load episodes here.
            </p>
            <button
              onClick={() => navigate("/")}
              style={{
                marginTop: "1.5rem",
                background: "#6c47ff",
                color: "#fff",
                border: "none",
                padding: "0.65rem 1.5rem",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              Go to Home
            </button>
          </div>
        )}

        {/* ── CHANNEL HEADER ── */}
        {channel && !loading && (
          <div
            style={{
              display: "flex",
              gap: "1.25rem",
              alignItems: "flex-start",
              background: "#fff",
              borderRadius: "16px",
              padding: "1.5rem",
              marginBottom: "2rem",
              boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
              border: "1px solid #ebebeb",
            }}
          >
            {channel.image && (
              <img
                src={channel.image}
                alt={channel.title}
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "12px",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  color: "#6c47ff",
                  fontSize: "0.72rem",
                  fontWeight: "700",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "0.3rem",
                }}
              >
                Now Loaded
              </p>
              <h1
                style={{
                  fontSize: "1.3rem",
                  fontFamily: "Georgia, serif",
                  fontWeight: "normal",
                  color: "#1a1a2e",
                  marginBottom: "0.3rem",
                }}
              >
                {channel.title}
              </h1>
              <p
                style={{
                  color: "#aaa",
                  fontSize: "0.82rem",
                  marginBottom: "0.5rem",
                }}
              >
                {episodes.length} episodes
              </p>
              <p
                style={{
                  color: "#888",
                  fontSize: "0.82rem",
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {channel.description}
              </p>
            </div>
          </div>
        )}

        {/* ── EPISODE LIST ── */}
        {episodes.length > 0 && (
          <div>
            <p
              style={{
                color: "#aaa",
                fontSize: "0.75rem",
                fontWeight: "700",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              Episodes
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "2px" }}
            >
              {episodes.map((episode, index) => (
                <div
                  key={episode.guid || index}
                  onClick={() =>
                    navigate(`/player/${encodeURIComponent(episode.guid)}`, {
                      state: { episode },
                    })
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1rem 1.25rem",
                    background: "#fff",
                    borderRadius: "12px",
                    cursor: "pointer",
                    border: "1px solid #f0f0f0",
                    transition: "all 0.15s",
                    marginBottom: "4px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f8f7ff";
                    e.currentTarget.style.borderColor = "#d4c9ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.borderColor = "#f0f0f0";
                  }}
                >
                  {/* Episode number */}
                  <span
                    style={{
                      color: "#ddd",
                      fontSize: "0.8rem",
                      fontFamily: "monospace",
                      minWidth: "24px",
                      textAlign: "right",
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {/* Thumbnail */}
                  {episode.image && (
                    <img
                      src={episode.image}
                      alt={episode.title}
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "8px",
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        color: "#1a1a2e",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        marginBottom: "0.2rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {episode.title}
                    </p>
                    <p style={{ color: "#bbb", fontSize: "0.78rem" }}>
                      {episode.pubDate}
                      {episode.duration ? ` · ${episode.duration}` : ""}
                    </p>
                  </div>

                  {/* Play button */}
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      background: "#f0edff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="#6c47ff"
                    >
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RSSPage;
