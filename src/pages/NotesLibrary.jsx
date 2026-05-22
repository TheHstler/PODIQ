/* ─────────────────────────────────────────────────────────────────────────────
   src/pages/NotesLibrary.jsx  —  Notes Library Page
   Dark premium redesign. All logic unchanged.
───────────────────────────────────────────────────────────────────────────── */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { colors, fonts, effects, card, btnPrimary, btnGhost, input, nav } from "../styles/theme";

function NotesLibrary() {
  const navigate = useNavigate();
  const [allNotes, setAllNotes] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const library = JSON.parse(localStorage.getItem("notes_library") || "[]");
    library.sort((a, b) => b.id - a.id);
    setAllNotes(library);
  }, []);

  function handleDelete(noteId, episodeGuid) {
    const library = JSON.parse(localStorage.getItem("notes_library") || "[]");
    localStorage.setItem("notes_library", JSON.stringify(library.filter((n) => n.id !== noteId)));
    const episodeKey = `notes_${episodeGuid}`;
    const episodeNotes = JSON.parse(localStorage.getItem(episodeKey) || "[]");
    localStorage.setItem(episodeKey, JSON.stringify(episodeNotes.filter((n) => n.id !== noteId)));
    setAllNotes(allNotes.filter((n) => n.id !== noteId));
  }

  function handleClearAll() {
    if (!window.confirm("Delete all notes from your library? This cannot be undone.")) return;
    localStorage.setItem("notes_library", "[]");
    setAllNotes([]);
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const filtered = allNotes.filter((note) => {
    const term = search.toLowerCase();
    return note.text?.toLowerCase().includes(term) || note.episodeTitle?.toLowerCase().includes(term);
  });

  const grouped = filtered.reduce((acc, note) => {
    const key = note.episodeGuid || note.episodeTitle;
    if (!acc[key]) acc[key] = { title: note.episodeTitle, image: note.podcastImage, notes: [] };
    acc[key].notes.push(note);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.textPrimary, fontFamily: fonts.body }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::placeholder { color: #6B6B7A; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={nav}>
        <span onClick={() => navigate("/")} style={{ fontSize: "1.3rem", fontWeight: "800", fontFamily: fonts.heading, cursor: "pointer" }}>
          POD<span style={{ color: colors.purple }}>PLAYER</span>
        </span>
        <button onClick={() => navigate(-1)} style={{
          background: colors.bgCard, border: `1px solid ${colors.border}`,
          color: colors.textSecondary, padding: "0.45rem 1rem",
          borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem",
        }}>← Back</button>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "3.5rem 2rem 5rem" }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ marginBottom: "2.5rem", animation: "fadeUp 0.5s ease both" }}>
          <p style={{ color: colors.purple, fontSize: "0.7rem", fontWeight: "700", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Your Library
          </p>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <h1 style={{ fontFamily: fonts.heading, fontSize: "2.2rem", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "0.4rem" }}>
                Notes Library
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: "0.9rem" }}>
                {allNotes.length === 0
                  ? "No notes saved yet — start listening and take notes!"
                  : `${allNotes.length} note${allNotes.length > 1 ? "s" : ""} across ${Object.keys(grouped).length} episode${Object.keys(grouped).length > 1 ? "s" : ""}`}
              </p>
            </div>
            {allNotes.length > 0 && (
              <button onClick={handleClearAll} style={{
                background: "none", border: "1px solid rgba(239,68,68,0.3)",
                color: colors.red, padding: "0.45rem 1rem",
                borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem",
                flexShrink: 0, transition: "all 0.15s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* ── SEARCH ── */}
        {allNotes.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            background: colors.bgCard, border: `1px solid ${colors.border}`,
            borderRadius: "12px", padding: "0.6rem 1rem", marginBottom: "2rem",
            animation: "fadeUp 0.5s ease 0.1s both",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your notes by keyword or episode title..."
              style={{ ...input, background: "transparent", border: "none", flex: 1, fontSize: "0.9rem", padding: 0 }}
            />
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {allNotes.length === 0 && (
          <div style={{
            background: colors.bgCard, border: `1px solid ${colors.border}`,
            borderRadius: "20px", padding: "4rem 2rem", textAlign: "center",
            animation: "fadeUp 0.5s ease 0.1s both",
          }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%", background: colors.purpleDim,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem", fontSize: "1.6rem",
            }}>📝</div>
            <p style={{ color: colors.textSecondary, fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Your notes will appear here once you start saving them while listening.
            </p>
            <button onClick={() => navigate("/")} style={{ ...btnPrimary }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
              Browse Podcasts
            </button>
          </div>
        )}

        {/* ── NO SEARCH RESULTS ── */}
        {allNotes.length > 0 && filtered.length === 0 && (
          <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: "12px", padding: "2rem", textAlign: "center", color: colors.textMuted }}>
            <p>No notes match "{search}"</p>
          </div>
        )}

        {/* ── GROUPED NOTES BY EPISODE ── */}
        {Object.entries(grouped).map(([key, group], groupIndex) => (
          <div key={key} style={{ marginBottom: "2rem", animation: `fadeUp 0.4s ease ${groupIndex * 0.08}s both` }}>

            {/* Episode header */}
            <div style={{
              display: "flex", alignItems: "center", gap: "0.85rem",
              marginBottom: "0.85rem", padding: "0 0.25rem",
            }}>
              {group.image && (
                <img src={group.image} alt={group.title} style={{
                  width: "44px", height: "44px", borderRadius: "10px",
                  objectFit: "cover", flexShrink: 0,
                  border: `1px solid ${colors.border}`,
                }} />
              )}
              <div>
                <p style={{ fontWeight: "700", color: colors.textPrimary, fontSize: "0.92rem", marginBottom: "0.15rem" }}>
                  {group.title}
                </p>
                <p style={{ color: colors.textMuted, fontSize: "0.75rem" }}>
                  {group.notes.length} note{group.notes.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Notes */}
            {group.notes.map((note, noteIndex) => (
              <div key={note.id} style={{
                background: colors.bgCard, border: `1px solid ${colors.border}`,
                borderRadius: "14px", padding: "1.1rem 1.25rem", marginBottom: "0.6rem",
                transition: "border-color 0.15s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.borderAccent; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; }}
              >
                {/* Meta row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    {/* Timestamp badge */}
                    <span style={{
                      background: colors.purpleDim, color: colors.purpleLight,
                      padding: "0.15rem 0.55rem", borderRadius: "4px",
                      fontSize: "0.7rem", fontFamily: fonts.mono,
                    }}>
                      @ {formatTime(note.timestamp)}
                    </span>
                    <span style={{ color: colors.textMuted, fontSize: "0.72rem" }}>
                      {note.writtenAt}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(note.id, note.episodeGuid)} style={{
                    background: "none", border: "none", color: colors.textMuted,
                    cursor: "pointer", fontSize: "0.85rem", padding: "0.1rem 0.25rem",
                    borderRadius: "4px", transition: "color 0.15s",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = colors.red; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; }}
                  >✕</button>
                </div>

                {/* Note text */}
                <p style={{ color: colors.textSecondary, fontSize: "0.9rem", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {note.text}
                </p>
              </div>
            ))}
          </div>
        ))}

        {/* Footer */}
        {allNotes.length > 0 && (
          <p style={{ color: colors.textMuted, fontSize: "0.75rem", textAlign: "center", marginTop: "1.5rem" }}>
            Notes are saved locally in your browser
          </p>
        )}
      </div>
    </div>
  );
}

export default NotesLibrary;
