import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────────────────────────────────────────
   NotesLibrary.jsx
   A full page showing ALL notes the user has saved across every episode.
   Each note shows: which podcast it came from, when it was written,
   the audio timestamp it was written at, and the note text.
   Users can delete notes or jump back to the episode.
───────────────────────────────────────────────────────────────────────────── */

function NotesLibrary() {
  const navigate = useNavigate();

  // All notes across all episodes, loaded from localStorage
  const [allNotes, setAllNotes] = useState([]);
  // Search filter so user can find notes quickly
  const [search, setSearch] = useState("");

  /* ── LOAD ALL NOTES FROM LOCALSTORAGE ON MOUNT ── */
  useEffect(() => {
    const library = JSON.parse(localStorage.getItem("notes_library") || "[]");
    // Sort newest first
    library.sort((a, b) => b.id - a.id);
    setAllNotes(library);
  }, []);

  /* ── DELETE A NOTE ── */
  function handleDelete(noteId, episodeGuid) {
    // Remove from global library
    const library = JSON.parse(localStorage.getItem("notes_library") || "[]");
    const updatedLibrary = library.filter((n) => n.id !== noteId);
    localStorage.setItem("notes_library", JSON.stringify(updatedLibrary));

    // Also remove from the episode-specific key
    const episodeKey = `notes_${episodeGuid}`;
    const episodeNotes = JSON.parse(localStorage.getItem(episodeKey) || "[]");
    const updatedEpisode = episodeNotes.filter((n) => n.id !== noteId);
    localStorage.setItem(episodeKey, JSON.stringify(updatedEpisode));

    // Update state
    setAllNotes(allNotes.filter((n) => n.id !== noteId));
  }

  /* ── CLEAR ALL NOTES ── */
  function handleClearAll() {
    if (
      !window.confirm(
        "Delete all notes from your library? This cannot be undone.",
      )
    )
      return;
    localStorage.setItem("notes_library", "[]");
    setAllNotes([]);
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  /* ── FILTER NOTES BY SEARCH TERM ── */
  const filtered = allNotes.filter((note) => {
    const term = search.toLowerCase();
    return (
      note.text?.toLowerCase().includes(term) ||
      note.episodeTitle?.toLowerCase().includes(term)
    );
  });

  /* ── GROUP NOTES BY EPISODE ── */
  const grouped = filtered.reduce((acc, note) => {
    const key = note.episodeGuid || note.episodeTitle;
    if (!acc[key]) {
      acc[key] = {
        title: note.episodeTitle,
        image: note.podcastImage,
        notes: [],
      };
    }
    acc[key].notes.push(note);
    return acc;
  }, {});

  return (
    <div
      style={{ minHeight: "100vh", background: "#f8f7f4", color: "#1a1a2e" }}
    >
      {/* ── NAV ── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 2.5rem",
          background: "#fff",
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
          onClick={() => navigate(-1)}
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
          Back
        </button>
      </nav>

      {/* ── PAGE HEADER ── */}
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "3rem 2rem 1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.8rem",
                fontFamily: "Georgia, serif",
                fontWeight: "normal",
                color: "#1a1a2e",
                marginBottom: "0.4rem",
              }}
            >
              Notes Library
            </h1>
            <p style={{ color: "#aaa", fontSize: "0.9rem" }}>
              {allNotes.length === 0
                ? "No notes saved yet — start listening and take notes!"
                : `${allNotes.length} note${allNotes.length > 1 ? "s" : ""} across ${Object.keys(grouped).length} episode${Object.keys(grouped).length > 1 ? "s" : ""}`}
            </p>
          </div>
          {allNotes.length > 0 && (
            <button
              onClick={handleClearAll}
              style={{
                background: "none",
                border: "1px solid #fecaca",
                color: "#ef4444",
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: "500",
              }}
            >
              Clear All
            </button>
          )}
        </div>

        {/* ── SEARCH ── */}
        {allNotes.length > 0 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your notes..."
            style={{
              width: "100%",
              border: "1px solid #ebebeb",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              fontSize: "0.9rem",
              background: "#fff",
              color: "#1a1a2e",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: "2rem",
            }}
          />
        )}

        {/* ── EMPTY STATE ── */}
        {allNotes.length === 0 && (
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "3rem 2rem",
              textAlign: "center",
              border: "1px solid #ebebeb",
            }}
          >
            <p style={{ fontSize: "2rem", marginBottom: "1rem" }}>📝</p>
            <p
              style={{
                color: "#aaa",
                fontSize: "0.95rem",
                marginBottom: "1.25rem",
              }}
            >
              Your notes will appear here once you start saving them while
              listening.
            </p>
            <button
              onClick={() => navigate("/")}
              style={{
                background: "#6c47ff",
                color: "#fff",
                border: "none",
                padding: "0.6rem 1.5rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.88rem",
                fontWeight: "600",
              }}
            >
              Browse Podcasts
            </button>
          </div>
        )}

        {/* ── NO SEARCH RESULTS ── */}
        {allNotes.length > 0 && filtered.length === 0 && (
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              border: "1px solid #ebebeb",
              color: "#bbb",
            }}
          >
            <p>No notes match "{search}"</p>
          </div>
        )}

        {/* ── GROUPED NOTES BY EPISODE ── */}
        {Object.entries(grouped).map(([key, group]) => (
          <div key={key} style={{ marginBottom: "2rem" }}>
            {/* Episode header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              {group.image && (
                <img
                  src={group.image}
                  alt={group.title}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
              )}
              <div>
                <p
                  style={{
                    fontWeight: "700",
                    color: "#1a1a2e",
                    fontSize: "0.9rem",
                    marginBottom: "0.1rem",
                  }}
                >
                  {group.title}
                </p>
                <p style={{ color: "#aaa", fontSize: "0.75rem" }}>
                  {group.notes.length} note{group.notes.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Notes for this episode */}
            {group.notes.map((note) => (
              <div
                key={note.id}
                style={{
                  background: "#fff",
                  border: "1px solid #ebebeb",
                  borderRadius: "12px",
                  padding: "1rem 1.25rem",
                  marginBottom: "0.6rem",
                }}
              >
                {/* Note meta: timestamp + date written */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {/* Audio timestamp the note was written at */}
                    <span
                      style={{
                        background: "#f0edff",
                        color: "#6c47ff",
                        padding: "0.12rem 0.45rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontFamily: "monospace",
                      }}
                    >
                      @ {formatTime(note.timestamp)}
                    </span>
                    <span style={{ color: "#bbb", fontSize: "0.72rem" }}>
                      Written {note.writtenAt}
                    </span>
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(note.id, note.episodeGuid)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ddd",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Note text */}
                <p
                  style={{
                    color: "#444",
                    fontSize: "0.9rem",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    margin: 0,
                  }}
                >
                  {note.text}
                </p>
              </div>
            ))}
          </div>
        ))}

        {/* ── FOOTER ── */}
        {allNotes.length > 0 && (
          <p
            style={{
              color: "#ddd",
              fontSize: "0.75rem",
              textAlign: "center",
              marginTop: "2rem",
            }}
          >
            Notes are saved locally in your browser
          </p>
        )}
      </div>
    </div>
  );
}

export default NotesLibrary;
