import { useNavigate } from "react-router-dom";
import { useState } from "react";

const FEATURED_PODCASTS = [
  {
    title: "Freakonomics Radio",
    description:
      "Surprising and counterintuitive stories about economics and human behaviour.",
    rssUrl: "https://feeds.simplecast.com/Y8lFbOT4",
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  function handleLoadUrl() {
    if (rssUrl.trim()) {
      navigate(`/rss?url=${encodeURIComponent(rssUrl.trim())}`);
    }
  }

  function handleFeaturedClick(feedUrl) {
    navigate(`/rss?url=${encodeURIComponent(feedUrl)}`);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError("");
    setSearchResults([]);
    try {
      const response = await fetch(
        `http://localhost:3001/api/search?q=${encodeURIComponent(searchQuery.trim())}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSearchResults(data.podcasts || []);
    } catch (err) {
      setSearchError("Search failed: " + err.message);
    } finally {
      setIsSearching(false);
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
          style={{
            fontSize: "1.3rem",
            fontWeight: "700",
            letterSpacing: "0.04em",
            color: "#1a1a2e",
            fontFamily: "Georgia, serif",
          }}
        >
          POD<span style={{ color: "#6c47ff" }}>PLAYER</span>
        </span>
      </nav>

      {/* ── HERO ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "5rem 2rem 3rem",
          background: "linear-gradient(160deg, #f0edff 0%, #f8f7f4 60%)",
        }}
      >
        <span
          style={{
            background: "#ede9ff",
            color: "#6c47ff",
            fontSize: "0.75rem",
            fontWeight: "600",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            padding: "0.35rem 1rem",
            borderRadius: "20px",
            marginBottom: "1.5rem",
          }}
        >
          Your podcast companion
        </span>

        <h1
          style={{
            fontSize: "clamp(2.5rem, 7vw, 5rem)",
            fontFamily: "Georgia, serif",
            fontWeight: "normal",
            color: "#1a1a2e",
            lineHeight: 1.1,
            marginBottom: "1rem",
            maxWidth: "700px",
          }}
        >
          Listen smarter.
          <br />
          <span style={{ color: "#6c47ff" }}>Learn deeper.</span>
        </h1>

        <p
          style={{
            color: "#888",
            fontSize: "1.05rem",
            marginBottom: "2.5rem",
            maxWidth: "460px",
            lineHeight: 1.6,
          }}
        >
          Search any podcast, get AI transcripts, key insights and take notes —
          all in one place.
        </p>

        {/* ── SEARCH INPUT ── */}
        <div style={{ width: "100%", maxWidth: "580px" }}>
          {/* Search by name */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "0.6rem",
              background: "#fff",
              border: "1.5px solid #e0e0e0",
              borderRadius: "14px",
              padding: "0.4rem 0.4rem 0.4rem 1.25rem",
              boxShadow: "0 2px 16px rgba(108,71,255,0.06)",
              alignItems: "center",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#aaa"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search podcasts by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "0.95rem",
                color: "#1a1a2e",
                background: "transparent",
                fontFamily: "Georgia, serif",
              }}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              style={{
                background: "#6c47ff",
                color: "#fff",
                border: "none",
                padding: "0.65rem 1.4rem",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
            >
              {isSearching ? "..." : "Search"}
            </button>
          </div>

          {/* RSS paste */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              background: "#fff",
              border: "1.5px solid #ebebeb",
              borderRadius: "14px",
              padding: "0.4rem 0.4rem 0.4rem 1.25rem",
              alignItems: "center",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ccc"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 11a9 9 0 0 1 9 9" />
              <path d="M4 4a16 16 0 0 1 16 16" />
              <circle cx="5" cy="19" r="1" />
            </svg>
            <input
              type="text"
              placeholder="...or paste an RSS feed URL"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLoadUrl();
              }}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "0.9rem",
                color: "#1a1a2e",
                background: "transparent",
                fontFamily: "Georgia, serif",
              }}
            />
            <button
              onClick={handleLoadUrl}
              style={{
                background: "transparent",
                color: "#6c47ff",
                border: "1.5px solid #6c47ff",
                padding: "0.55rem 1.2rem",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
            >
              Load
            </button>
          </div>

          {/* Search error */}
          {searchError && (
            <p
              style={{
                color: "#e53e3e",
                fontSize: "0.85rem",
                marginTop: "0.75rem",
              }}
            >
              {searchError}
            </p>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div
              style={{
                marginTop: "0.5rem",
                background: "#fff",
                border: "1.5px solid #e0e0e0",
                borderRadius: "14px",
                overflow: "hidden",
                textAlign: "left",
                boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
              }}
            >
              {searchResults.slice(0, 5).map((podcast, index) => (
                <div
                  key={podcast.uuid || index}
                  onClick={() =>
                    navigate(`/rss?url=${encodeURIComponent(podcast.rssUrl)}`)
                  }
                  style={{
                    display: "flex",
                    gap: "0.9rem",
                    alignItems: "center",
                    padding: "0.85rem 1.25rem",
                    borderTop: index === 0 ? "none" : "1px solid #f0f0f0",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8f7ff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {podcast.imageUrl && (
                    <img
                      src={podcast.imageUrl}
                      alt={podcast.name}
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "8px",
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        color: "#1a1a2e",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        marginBottom: "0.15rem",
                      }}
                    >
                      {podcast.name}
                    </p>
                    <p
                      style={{
                        color: "#aaa",
                        fontSize: "0.78rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {podcast.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── FEATURED PODCASTS ── */}
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "2rem 2rem 4rem",
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <p
            style={{
              color: "#1a1a2e",
              fontSize: "1.1rem",
              fontWeight: "700",
              marginBottom: "0.25rem",
            }}
          >
            Featured Podcasts
          </p>
          <p style={{ color: "#aaa", fontSize: "0.85rem" }}>
            Click any show to browse its episodes
          </p>
        </div>

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
                height: "220px",
                background: podcast.color,
                boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow =
                  "0 12px 40px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.08)";
              }}
            >
              <img
                src={podcast.image}
                alt={podcast.title}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.4,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "75%",
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.92), transparent)",
                }}
              />
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
                    color: "#fff",
                    fontSize: "1.05rem",
                    fontFamily: "Georgia, serif",
                    fontWeight: "normal",
                    marginBottom: "0.35rem",
                  }}
                >
                  {podcast.title}
                </h3>
                <p
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: "0.78rem",
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {podcast.description}
                </p>
              </div>
              {/* Play indicator top right */}
              <div
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  padding: "0.3rem 0.7rem",
                  color: "#fff",
                  fontSize: "0.72rem",
                  fontWeight: "600",
                  letterSpacing: "0.05em",
                }}
              >
                LISTEN
              </div>
            </div>
          ))}
        </div>

        <p
          style={{
            color: "#ccc",
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
