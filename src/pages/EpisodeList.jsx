/* ─────────────────────────────────────────────────────────────────────────────
   src/pages/EpisodeList.jsx  —  Homepage
   Fixed: Search and Load Feed buttons are now identical height and style.
   Removed: Sign In, Trending, Discover.
   Added: light/dark toggle.
───────────────────────────────────────────────────────────────────────────── */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { colors, fonts, effects } from "../styles/theme";

const FEATURED_PODCASTS = [
  { title: "Freakonomics Radio", description: "Surprising and counterintuitive stories about economics and human behaviour.", rssUrl: "https://feeds.simplecast.com/Y8lFbOT4", image: "https://picsum.photos/seed/freakonomics/600/400", accent: "#6EE7B7" },
  { title: "Darknet Diaries", description: "True stories from the dark side of the internet — hacking, cybercrime and espionage.", rssUrl: "https://feeds.megaphone.fm/darknetdiaries", image: "https://picsum.photos/seed/darknet/600/400", accent: "#8B5CF6" },
  { title: "The Daily", description: "The biggest stories of our time, told by the journalists who cover them.", rssUrl: "https://feeds.simplecast.com/54nAGcIl", image: "https://picsum.photos/seed/thedaily/600/400", accent: "#60A5FA" },
  { title: "How I Built This", description: "Guy Raz dives into the stories behind some of the world's best known companies.", rssUrl: "https://feeds.npr.org/510313/podcast.xml", image: "https://picsum.photos/seed/howIbuilt/600/400", accent: "#F472B6" },
];

const FEATURES = [
  { icon: "🎙️", label: "AI Transcripts" },
  { icon: "✨", label: "Smart Insights" },
  { icon: "🔖", label: "Bookmarks" },
  { icon: "📝", label: "Notes Library" },
  { icon: "📖", label: "Chapter Markers" },
];

function EpisodeList({ isDark, toggleTheme }) {
  const navigate = useNavigate();
  const [rssUrl, setRssUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hoveredCard, setHoveredCard] = useState(null);

  /* ── THEME TOKENS ── */
  const c = isDark ? {
    bg: colors.bg, card: colors.bgCard, cardHover: colors.bgCardHover,
    text: colors.textPrimary, textSub: colors.textSecondary, textMuted: colors.textMuted,
    border: colors.border, borderAccent: colors.borderAccent,
    navBg: "rgba(15,15,18,0.88)", inputBg: colors.bgInput,
  } : {
    bg: "#f8f7f4", card: "#ffffff", cardHover: "#f8f7ff",
    text: "#1a1a2e", textSub: "#555", textMuted: "#999",
    border: "#e8e8e8", borderAccent: "rgba(108,71,255,0.25)",
    navBg: "rgba(255,255,255,0.95)", inputBg: "#fafafa",
  };

  /* Shared button height so Search and Load Feed are identical */
  const BTN_H = "48px";

  function handleLoadUrl() {
    if (rssUrl.trim()) navigate(`/rss?url=${encodeURIComponent(rssUrl.trim())}`);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setIsSearching(true); setSearchError(""); setSearchResults([]);
    try {
      const res = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSearchResults(data.podcasts || []);
    } catch (err) {
      setSearchError("Search failed: " + err.message);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: fonts.body, transition: "background 0.3s, color 0.3s" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::placeholder { color: #6B6B7A; }
        input { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2.5rem", background: c.navBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${c.border}`, position: "sticky", top: 0, zIndex: 200 }}>
        <span style={{ fontSize: "1.3rem", fontWeight: "800", fontFamily: fonts.heading }}>
          POD<span style={{ color: colors.purple }}>PLAYER</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button onClick={() => navigate("/notes")} style={{ background: "none", border: `1px solid ${c.border}`, color: c.textSub, padding: "0.45rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "500", fontFamily: fonts.body, transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.purple; e.currentTarget.style.color = colors.purple; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.textSub; }}>
            My Notes
          </button>
          <button onClick={toggleTheme} style={{ background: isDark ? colors.purpleDim : "#f0edff", border: `1px solid ${c.borderAccent}`, borderRadius: "20px", padding: "0.4rem 0.85rem", cursor: "pointer", fontSize: "0.85rem", color: colors.purple, fontWeight: "600", fontFamily: fonts.body, transition: "all 0.2s" }}>
            {isDark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ position: "relative", padding: "6rem 2rem 4rem", textAlign: "center", overflow: "hidden" }}>
        {/* Background glow blobs */}
        <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: "700px", height: "500px", borderRadius: "50%", background: isDark ? "radial-gradient(ellipse, rgba(139,92,246,0.14) 0%, transparent 70%)" : "radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: isDark ? colors.purpleDim : "#f0edff", border: `1px solid ${c.borderAccent}`, borderRadius: "20px", padding: "0.35rem 1rem", marginBottom: "1.75rem", animation: "fadeUp 0.6s ease both" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors.teal, display: "inline-block", animation: "pulse 2s infinite" }} />
          <span style={{ color: colors.purple, fontSize: "0.75rem", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase" }}>AI-Powered Podcast Platform</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontFamily: fonts.heading, fontSize: "clamp(2.8rem, 7vw, 5.5rem)", fontWeight: "800", lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: "1.5rem", animation: "fadeUp 0.7s ease 0.1s both" }}>
          Listen smarter.
          <br />
          <span style={{ background: "linear-gradient(135deg, #8B5CF6, #A78BFA, #6EE7B7)", backgroundSize: "200% 200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "gradientShift 4s ease infinite" }}>
            Learn deeper.
          </span>
        </h1>

        <p style={{ color: c.textMuted, fontSize: "1.05rem", lineHeight: 1.7, maxWidth: "490px", margin: "0 auto 3rem", animation: "fadeUp 0.7s ease 0.2s both" }}>
          Search any podcast, get AI transcripts, discover key insights and take timestamped notes.
        </p>

        {/* ── SEARCH BOX ── */}
        <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto", animation: "fadeUp 0.7s ease 0.3s both" }}>

          {/* Row 1: Search input + Search button */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem", height: BTN_H }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem", background: c.card, border: `1.5px solid ${c.border}`, borderRadius: "12px", padding: "0 1rem", boxShadow: isDark ? effects.glowPurple : "0 2px 12px rgba(0,0,0,0.05)", height: "100%" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text" placeholder="Search podcasts by name or topic..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                style={{ flex: 1, border: "none", outline: "none", fontSize: "0.95rem", color: c.text, background: "transparent", fontFamily: fonts.body, height: "100%" }}
              />
            </div>
            {/* Search button — height matches the input row */}
            <button onClick={handleSearch} disabled={isSearching} style={{
              height: "100%", padding: "0 1.5rem",
              background: `linear-gradient(135deg, ${colors.purple}, ${colors.purpleLight})`,
              color: "#fff", border: "none", borderRadius: "12px",
              cursor: isSearching ? "not-allowed" : "pointer",
              fontSize: "0.92rem", fontWeight: "700",
              fontFamily: fonts.body, flexShrink: 0,
              boxShadow: isDark ? effects.glowPurple : "0 4px 16px rgba(139,92,246,0.3)",
              whiteSpace: "nowrap", transition: "opacity 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Row 2: RSS input + Load Feed button — same height as row 1 */}
          <div style={{ display: "flex", gap: "0.5rem", height: BTN_H }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem", background: c.card, border: `1px solid ${c.border}`, borderRadius: "12px", padding: "0 1rem", height: "100%" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" />
              </svg>
              <input
                type="text" placeholder="...or paste an RSS feed URL"
                value={rssUrl} onChange={(e) => setRssUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoadUrl()}
                style={{ flex: 1, border: "none", outline: "none", fontSize: "0.9rem", color: c.text, background: "transparent", fontFamily: fonts.body, height: "100%" }}
              />
            </div>
            {/* Load Feed button — same height and padding as Search button */}
            <button onClick={handleLoadUrl} style={{
              height: "100%", padding: "0 1.5rem",
              background: "transparent",
              color: colors.purple,
              border: `1.5px solid ${isDark ? colors.borderAccent : "rgba(108,71,255,0.35)"}`,
              borderRadius: "12px", cursor: "pointer",
              fontSize: "0.92rem", fontWeight: "700",
              fontFamily: fonts.body, flexShrink: 0,
              whiteSpace: "nowrap", transition: "all 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? colors.purpleDim : "#f0edff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Load Feed
            </button>
          </div>

          {/* Error */}
          {searchError && <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "0.75rem" }}>{searchError}</p>}

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div style={{ marginTop: "0.5rem", background: c.card, border: `1px solid ${c.border}`, borderRadius: "14px", overflow: "hidden", textAlign: "left", boxShadow: isDark ? "0 16px 48px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.1)" }}>
              {searchResults.slice(0, 6).map((podcast, index) => (
                <div key={podcast.uuid || index}
                  onClick={() => navigate(`/rss?url=${encodeURIComponent(podcast.rssUrl)}`)}
                  style={{ display: "flex", gap: "0.9rem", alignItems: "center", padding: "0.85rem 1.25rem", borderTop: index === 0 ? "none" : `1px solid ${c.border}`, cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = c.cardHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {podcast.imageUrl && <img src={podcast.imageUrl} alt={podcast.name} style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: c.text, fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.15rem" }}>{podcast.name}</p>
                    <p style={{ color: c.textMuted, fontSize: "0.78rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{podcast.description}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="2" style={{ flexShrink: 0, marginLeft: "auto" }}><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.6rem", marginTop: "2.5rem", animation: "fadeUp 0.7s ease 0.4s both" }}>
          {FEATURES.map((f) => (
            <div key={f.label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: c.card, border: `1px solid ${c.border}`, borderRadius: "40px", padding: "0.4rem 0.85rem", transition: "all 0.2s", cursor: "default" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.purple; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <span style={{ fontSize: "0.85rem" }}>{f.icon}</span>
              <span style={{ color: c.textSub, fontSize: "0.8rem", fontWeight: "500" }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURED PODCASTS ── */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1rem 2rem 6rem" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.75rem" }}>
          <div>
            <p style={{ color: colors.purple, fontSize: "0.7rem", fontWeight: "700", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Featured</p>
            <h2 style={{ fontFamily: fonts.heading, fontSize: "1.6rem", fontWeight: "800", letterSpacing: "-0.02em" }}>Start Listening</h2>
          </div>
          <p style={{ color: c.textMuted, fontSize: "0.85rem" }}>Click any show to browse episodes</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
          {FEATURED_PODCASTS.map((podcast, index) => (
            <div key={index} onClick={() => navigate(`/rss?url=${encodeURIComponent(podcast.rssUrl)}`)}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                position: "relative", borderRadius: "20px", overflow: "hidden", cursor: "pointer", height: "240px",
                background: "#1a1a2e",
                border: hoveredCard === index ? `1px solid ${podcast.accent}55` : `1px solid ${c.border}`,
                boxShadow: hoveredCard === index ? `0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px ${podcast.accent}33` : "0 4px 20px rgba(0,0,0,0.15)",
                transform: hoveredCard === index ? "translateY(-4px)" : "translateY(0)",
                transition: "all 0.25s ease",
              }}
            >
              <img src={podcast.image} alt={podcast.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: hoveredCard === index ? 0.4 : 0.22, transition: "opacity 0.3s" }} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${podcast.accent}22 0%, transparent 50%, rgba(0,0,0,0.85) 100%)` }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "70%", background: "linear-gradient(to top, rgba(10,10,14,0.97), transparent)" }} />
              <div style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", border: `1px solid ${podcast.accent}44`, borderRadius: "8px", padding: "0.3rem 0.75rem", color: podcast.accent, fontSize: "0.68rem", fontWeight: "700", letterSpacing: "0.12em" }}>LISTEN →</div>
              <div style={{ position: "absolute", bottom: "1.5rem", left: "1.5rem", right: "1.5rem" }}>
                <h3 style={{ fontFamily: fonts.heading, color: "#fff", fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.35rem" }}>{podcast.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.78rem", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{podcast.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA strip */}
        <div style={{ marginTop: "2.5rem", background: isDark ? `linear-gradient(135deg, ${colors.bgCard}, rgba(139,92,246,0.08))` : "linear-gradient(135deg, #f8f7ff, #f0edff)", border: `1px solid ${c.borderAccent}`, borderRadius: "20px", padding: "2rem 2.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "2rem", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontFamily: fonts.heading, fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.4rem" }}>Have a podcast RSS feed?</h3>
            <p style={{ color: c.textMuted, fontSize: "0.88rem" }}>Paste any RSS URL above and PodPlayer loads every episode with AI transcripts.</p>
          </div>
          <button onClick={() => document.querySelector("input[placeholder*='RSS']")?.focus()} style={{ background: `linear-gradient(135deg, ${colors.purple}, ${colors.purpleLight})`, color: "#fff", border: "none", padding: "0.7rem 1.5rem", borderRadius: "12px", cursor: "pointer", fontSize: "0.9rem", fontWeight: "700", fontFamily: fonts.body, whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(139,92,246,0.3)" }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
            Load RSS Feed
          </button>
        </div>

        <p style={{ color: c.textMuted, fontSize: "0.75rem", textAlign: "center", marginTop: "3rem" }}>© 2025 PodPlayer — AI-powered podcast discovery</p>
      </div>
    </div>
  );
}

export default EpisodeList;
