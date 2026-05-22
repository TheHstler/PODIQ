/* ─────────────────────────────────────────────────────────────────────────────
   src/pages/RSSPage.jsx
   Two-column layout:
   LEFT  — scrollable episode list (number + thumbnail + title + duration)
   RIGHT — selected episode detail card (fixed sidebar)
   Clicking a row selects it and shows full info on the right.
───────────────────────────────────────────────────────────────────────────── */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { parseRSSFeed } from "../utils/rssParser";
import { colors, fonts, effects, btnPrimary, btnGhost } from "../styles/theme";

function RSSPage({ isDark, toggleTheme, loadEpisode, currentEpisode, isPlaying }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [episodes, setEpisodes] = useState([]);
  const [channel, setChannel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [episodeSearch, setEpisodeSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  /* selectedEp: the episode whose card shows in the RIGHT sidebar */
  const [selectedEp, setSelectedEp] = useState(null);

  /* ── THEME COLOURS ── */
  const c = isDark ? {
    bg: colors.bg, card: colors.bgCard, cardHover: colors.bgCardHover,
    text: colors.textPrimary, textSub: colors.textSecondary, textMuted: colors.textMuted,
    border: colors.border, borderAccent: colors.borderAccent,
    navBg: "rgba(15,15,18,0.9)", rowSelected: "rgba(139,92,246,0.12)",
  } : {
    bg: "#f8f7f4", card: "#ffffff", cardHover: "#f8f7ff",
    text: "#1a1a2e", textSub: "#555", textMuted: "#999",
    border: "#e8e8e8", borderAccent: "rgba(108,71,255,0.3)",
    navBg: "rgba(255,255,255,0.95)", rowSelected: "#f0edff",
  };

  useEffect(() => {
    const url = searchParams.get("url");
    if (!url) { setError("No RSS feed URL provided."); setIsLoading(false); return; }
    loadFeed(url);
  }, [searchParams]);

  async function loadFeed(url) {
    setIsLoading(true); setError("");
    try {
      const result = await parseRSSFeed(url);
      setChannel(result.channel);
      setEpisodes(result.episodes);
      /* Auto-select first episode so right panel isn't empty on load */
      if (result.episodes.length > 0) setSelectedEp(result.episodes[0]);
    } catch (err) {
      setError("Could not load feed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function formatDuration(dur) {
    if (!dur) return "";
    if (typeof dur === "string" && dur.includes(":")) return dur;
    const s = parseInt(dur);
    if (isNaN(s)) return dur;
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
  }

  /* newest = RSS order, oldest = reversed */
  const filtered = episodes.filter((ep) =>
    ep.title.toLowerCase().includes(episodeSearch.toLowerCase()) ||
    ep.description.toLowerCase().includes(episodeSearch.toLowerCase())
  );
  const sorted = sortOrder === "oldest" ? [...filtered].reverse() : filtered;

  /* ── LOADING ── */
  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: c.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem", fontFamily: fonts.body }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;500;600&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: "36px", height: "36px", border: `3px solid ${isDark ? "rgba(139,92,246,0.2)" : "#e0d9ff"}`, borderTopColor: colors.purple, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: c.textMuted, fontSize: "0.9rem" }}>Loading podcast feed...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: c.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "2rem", fontFamily: fonts.body }}>
        <p style={{ color: c.text, fontWeight: "600" }}>Could not load this feed</p>
        <p style={{ color: c.textMuted, fontSize: "0.88rem" }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ ...btnPrimary }}>Go Home</button>
      </div>
    );
  }

  const isThisPlaying = (ep) => currentEpisode?.guid === ep.guid && isPlaying;

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: fonts.body, transition: "background 0.3s", paddingBottom: "5rem" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bar1{0%{height:4px}100%{height:14px}} @keyframes bar2{0%{height:10px}100%{height:4px}} @keyframes bar3{0%{height:14px}100%{height:8px}}
        * { box-sizing:border-box; }
        ::placeholder { color: #6B6B7A; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2.5rem", background: c.navBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${c.border}`, position: "sticky", top: 0, zIndex: 200 }}>
        <span onClick={() => navigate("/")} style={{ fontSize: "1.3rem", fontWeight: "800", fontFamily: fonts.heading, cursor: "pointer" }}>
          POD<span style={{ color: colors.purple }}>PLAYER</span>
        </span>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <button onClick={() => navigate("/notes")} style={{ background: "none", border: `1px solid ${c.border}`, color: c.textSub, padding: "0.45rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem", fontFamily: fonts.body, transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.purple; e.currentTarget.style.color = colors.purple; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.textSub; }}>My Notes</button>
          <button onClick={toggleTheme} style={{ background: isDark ? colors.purpleDim : "#f0edff", border: `1px solid ${c.borderAccent}`, borderRadius: "20px", padding: "0.4rem 0.85rem", cursor: "pointer", fontSize: "0.82rem", color: colors.purple, fontWeight: "600", fontFamily: fonts.body }}>
            {isDark ? "☀️" : "🌙"}
          </button>
          <button onClick={() => navigate(-1)} style={{ background: c.card, border: `1px solid ${c.border}`, color: c.textSub, padding: "0.45rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem", fontFamily: fonts.body }}>← Back</button>
        </div>
      </nav>

      {/* ── PODCAST HERO ── */}
      {channel && (
        <div style={{ position: "relative", overflow: "hidden" }}>
          {channel.image && (
            <>
              <img src={channel.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(60px) brightness(0.18) saturate(0.4)", transform: "scale(1.1)" }} />
              <div style={{ position: "absolute", inset: 0, background: isDark ? "rgba(15,15,18,0.7)" : "rgba(248,247,244,0.9)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60px", background: `linear-gradient(to bottom, transparent, ${c.bg})` }} />
            </>
          )}
          <div style={{ position: "relative", maxWidth: "1280px", margin: "0 auto", padding: "2.5rem 2rem 2rem", display: "flex", gap: "2rem", alignItems: "center" }}>
            {/* Artwork */}
            {channel.image && (
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img src={channel.image} alt={channel.title} style={{ width: "120px", height: "120px", borderRadius: "14px", objectFit: "cover", boxShadow: "0 8px 40px rgba(0,0,0,0.5)", border: `1px solid ${c.border}`, display: "block" }} />
              </div>
            )}

            {/* Channel info — more detail */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: colors.purple, fontSize: "0.67rem", fontWeight: "700", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Podcast</p>
              <h1 style={{ fontFamily: fonts.heading, fontSize: "clamp(1.4rem, 3.5vw, 2.2rem)", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "0.5rem", color: c.text }}>{channel.title}</h1>

              {/* Description — more lines shown */}
              {channel.description && (
                <p style={{ color: c.textMuted, fontSize: "0.82rem", lineHeight: 1.6, maxWidth: "600px", marginBottom: "0.75rem", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {channel.description}
                </p>
              )}

              {/* Stats row */}
              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                <span style={{ color: c.textMuted, fontSize: "0.78rem" }}>
                  <span style={{ color: c.text, fontWeight: "700" }}>{episodes.length}</span> episodes
                </span>
                <span style={{ width: "1px", height: "12px", background: c.border, display: "inline-block" }} />
                <span style={{ color: colors.teal, fontSize: "0.74rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: colors.teal, display: "inline-block" }} />
                  AI Transcripts Available
                </span>
                <span style={{ width: "1px", height: "12px", background: c.border, display: "inline-block" }} />
                <span style={{ color: colors.purple, fontSize: "0.74rem", fontWeight: "600" }}>✦ Smart Insights</span>
                <span style={{ width: "1px", height: "12px", background: c.border, display: "inline-block" }} />
                <span style={{ color: colors.blue, fontSize: "0.74rem", fontWeight: "600" }}>📖 Chapter Markers</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT: two-column layout ── */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.25rem 2rem" }}>

        {/* Controls bar above the two columns */}
        <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "160px", display: "flex", alignItems: "center", gap: "0.5rem", background: c.card, border: `1px solid ${c.border}`, borderRadius: "10px", padding: "0.5rem 1rem" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input value={episodeSearch} onChange={(e) => setEpisodeSearch(e.target.value)} placeholder="Search episodes..." style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: "0.87rem", color: c.text, fontFamily: fonts.body }} />
          </div>
          <div style={{ display: "flex", background: c.card, border: `1px solid ${c.border}`, borderRadius: "10px", padding: "3px", gap: "2px", flexShrink: 0 }}>
            {[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }].map((opt) => (
              <button key={opt.value} onClick={() => setSortOrder(opt.value)} style={{
                background: sortOrder === opt.value ? (isDark ? colors.purpleDim : "#f0edff") : "transparent",
                border: sortOrder === opt.value ? `1px solid ${c.borderAccent}` : "1px solid transparent",
                color: sortOrder === opt.value ? colors.purple : c.textMuted,
                borderRadius: "7px", padding: "0.38rem 0.85rem",
                fontSize: "0.78rem", fontWeight: "600", cursor: "pointer",
                transition: "all 0.15s", fontFamily: fonts.body,
              }}>{opt.label}</button>
            ))}
          </div>
          <span style={{ color: c.textMuted, fontSize: "0.8rem", flexShrink: 0 }}>{sorted.length} episodes</span>
        </div>

        {/* ── TWO COLUMN LAYOUT ── */}
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>

          {/* LEFT COLUMN — scrollable episode list */}
          <div style={{
            flex: 1, minWidth: 0,
            /* Max height so it scrolls independently */
            maxHeight: "calc(100vh - 280px)",
            overflowY: "auto",
            paddingRight: "4px",
          }}>
            {sorted.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem", color: c.textMuted }}>
                <p style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>🔍</p>
                <p>No episodes match "{episodeSearch}"</p>
              </div>
            )}

            {sorted.map((episode, index) => {
              const epKey = episode.guid || index;
              const isSelected = selectedEp?.guid === episode.guid || selectedEp === episode;
              const playing = isThisPlaying(episode);

              return (
                <div
                  key={epKey}
                  onClick={() => setSelectedEp(episode)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.85rem",
                    padding: "0.7rem 0.9rem",
                    marginBottom: "2px",
                    background: isSelected
                      ? (isDark ? "rgba(139,92,246,0.12)" : "#f0edff")
                      : "transparent",
                    border: isSelected
                      ? `1px solid ${c.borderAccent}`
                      : "1px solid transparent",
                    borderRadius: "10px",
                    cursor: "pointer", transition: "all 0.15s",
                    animation: `fadeUp 0.2s ease ${Math.min(index * 0.015, 0.2)}s both`,
                  }}
                  onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = isDark ? colors.bgCardHover : "#fafafa"; e.currentTarget.style.border = `1px solid ${c.border}`; } }}
                  onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.border = "1px solid transparent"; } }}
                >
                  {/* Episode number */}
                  <span style={{ color: c.textMuted, fontSize: "0.73rem", fontFamily: fonts.mono, width: "26px", textAlign: "center", flexShrink: 0 }}>
                    {index + 1}
                  </span>

                  {/* Thumbnail */}
                  {episode.image ? (
                    <img src={episode.image} alt="" style={{ width: "38px", height: "38px", borderRadius: "7px", objectFit: "cover", flexShrink: 0, border: `1px solid ${c.border}` }} />
                  ) : (
                    <div style={{ width: "38px", height: "38px", borderRadius: "7px", background: isDark ? colors.bgCardHover : "#ebebeb", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="2"><polygon points="5,3 19,12 5,21" /></svg>
                    </div>
                  )}

                  {/* Playing bars */}
                  {playing && (
                    <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", flexShrink: 0 }}>
                      {[1, 2, 3].map((b) => (
                        <div key={b} style={{ width: "3px", borderRadius: "2px", background: colors.teal, animation: `bar${b} 0.6s ease-in-out infinite alternate` }} />
                      ))}
                    </div>
                  )}

                  {/* Title — the main text in the row */}
                  <p style={{
                    color: isSelected ? colors.purple : (playing ? colors.teal : c.text),
                    fontSize: "0.87rem",
                    fontWeight: isSelected ? "600" : "500",
                    flex: 1,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    transition: "color 0.15s",
                  }}>
                    {episode.title}
                  </p>

                  {/* Duration */}
                  {episode.duration && (
                    <span style={{ color: c.textMuted, fontSize: "0.7rem", fontFamily: fonts.mono, flexShrink: 0 }}>
                      {formatDuration(episode.duration)}
                    </span>
                  )}

                  {/* Selected arrow indicator */}
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.purple} strokeWidth="2.5" style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>

          {/* RIGHT COLUMN — selected episode detail card */}
          <div style={{
            width: "360px", flexShrink: 0,
            position: "sticky", top: "90px",
            alignSelf: "flex-start",
          }}>
            {selectedEp ? (
              <div style={{
                background: c.card,
                border: `1px solid ${c.borderAccent}`,
                borderRadius: "18px",
                overflow: "hidden",
                boxShadow: isDark ? "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(139,92,246,0.1)" : "0 8px 32px rgba(108,71,255,0.1)",
                animation: "fadeUp 0.2s ease both",
              }}>

                {/* Episode artwork banner */}
                {selectedEp.image && (
                  <div style={{ position: "relative", height: "180px", overflow: "hidden" }}>
                    <img src={selectedEp.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(20px) brightness(0.3) saturate(0.6)", transform: "scale(1.1)" }} />
                    <div style={{ position: "absolute", inset: 0, background: "rgba(15,15,18,0.4)" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "80px", background: `linear-gradient(to bottom, transparent, ${c.card})` }} />
                    {/* Centred artwork on top of blur */}
                    <img src={selectedEp.image} alt={selectedEp.title} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "100px", height: "100px", borderRadius: "12px", objectFit: "cover", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  </div>
                )}

                {/* Episode info */}
                <div style={{ padding: "1.25rem" }}>

                  {/* Title */}
                  <h2 style={{ fontFamily: fonts.heading, fontSize: "1rem", fontWeight: "700", color: c.text, lineHeight: 1.3, marginBottom: "0.75rem" }}>
                    {selectedEp.title}
                  </h2>

                  {/* Meta grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.9rem" }}>
                    {selectedEp.pubDate && (
                      <div style={{ background: isDark ? colors.bgCardHover : "#f8f7f4", borderRadius: "8px", padding: "0.5rem 0.75rem" }}>
                        <p style={{ color: c.textMuted, fontSize: "0.62rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>Date</p>
                        <p style={{ color: c.text, fontSize: "0.78rem", fontWeight: "600" }}>{selectedEp.pubDate}</p>
                      </div>
                    )}
                    {selectedEp.duration && (
                      <div style={{ background: isDark ? colors.bgCardHover : "#f8f7f4", borderRadius: "8px", padding: "0.5rem 0.75rem" }}>
                        <p style={{ color: c.textMuted, fontSize: "0.62rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>Duration</p>
                        <p style={{ color: c.text, fontSize: "0.78rem", fontWeight: "600" }}>{formatDuration(selectedEp.duration)}</p>
                      </div>
                    )}
                    {channel?.title && (
                      <div style={{ background: isDark ? colors.bgCardHover : "#f8f7f4", borderRadius: "8px", padding: "0.5rem 0.75rem", gridColumn: "1 / -1" }}>
                        <p style={{ color: c.textMuted, fontSize: "0.62rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>Podcast</p>
                        <p style={{ color: c.text, fontSize: "0.78rem", fontWeight: "600" }}>{channel.title}</p>
                      </div>
                    )}
                  </div>

                  {/* AI feature badges */}
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.9rem" }}>
                    <span style={{ background: isDark ? colors.purpleDim : "#f0edff", color: colors.purple, fontSize: "0.65rem", fontWeight: "600", padding: "0.2rem 0.6rem", borderRadius: "20px", border: `1px solid ${c.borderAccent}` }}>✦ AI Transcript</span>
                    <span style={{ background: isDark ? "rgba(110,231,183,0.1)" : "#f0fdf9", color: colors.teal, fontSize: "0.65rem", fontWeight: "600", padding: "0.2rem 0.6rem", borderRadius: "20px", border: "1px solid rgba(110,231,183,0.2)" }}>Smart Insights</span>
                    <span style={{ background: isDark ? "rgba(96,165,250,0.1)" : "#eff6ff", color: colors.blue, fontSize: "0.65rem", fontWeight: "600", padding: "0.2rem 0.6rem", borderRadius: "20px", border: "1px solid rgba(96,165,250,0.2)" }}>Chapters</span>
                  </div>

                  {/* Description */}
                  {selectedEp.description && (
                    <p style={{ color: c.textMuted, fontSize: "0.8rem", lineHeight: 1.6, marginBottom: "1.1rem", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {selectedEp.description}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    {/* PRIMARY — go to full player page */}
                    <button
                      onClick={() => navigate(`/player/${encodeURIComponent(selectedEp.guid || selectedEp.title)}`, { state: { episode: selectedEp } })}
                      style={{
                        flex: 1, ...btnPrimary,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        gap: "0.5rem", padding: "0.7rem 1rem", fontSize: "0.88rem",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21" /></svg>
                      Play Episode
                    </button>

                    {/* SECONDARY — quick play without leaving page */}
                    {loadEpisode && (
                      <button
                        onClick={() => loadEpisode(selectedEp)}
                        style={{
                          background: "none",
                          border: `1px solid ${c.borderAccent}`,
                          color: colors.purple,
                          padding: "0.7rem 0.9rem",
                          borderRadius: "10px",
                          cursor: "pointer",
                          fontSize: "0.82rem",
                          fontWeight: "600",
                          fontFamily: fonts.body,
                          transition: "all 0.15s",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? colors.purpleDim : "#f0edff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                      >
                        {isThisPlaying(selectedEp) ? "⏸" : "▷"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state when nothing selected */
              <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: "18px", padding: "3rem 2rem", textAlign: "center" }}>
                <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>👆</p>
                <p style={{ color: c.textMuted, fontSize: "0.88rem" }}>Click any episode on the left to see its details here</p>
              </div>
            )}
          </div>
        </div>

        <p style={{ color: c.textMuted, fontSize: "0.72rem", textAlign: "center", marginTop: "2.5rem" }}>© 2025 PodPlayer</p>
      </div>
    </div>
  );
}

export default RSSPage;
