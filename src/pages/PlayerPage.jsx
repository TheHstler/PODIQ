import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useRef, useState } from "react";
import episodes from "../data/episodes";

function PlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  /* useLocation gives us access to the state passed via navigate(..., { state }) */
  const location = useLocation();

  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  /* markedMoments stores an array of transcript lines the user has bookmarked */
  const [markedMoments, setMarkedMoments] = useState([]);

  /* activeTab controls which panel is visible: "transcript", "insights", or "notes" */
  const [activeTab, setActiveTab] = useState("transcript");

  /* ── EPISODE RESOLUTION ────────────────────────────────────────────────────
     Priority 1: episode data passed via location.state (RSS episodes from
     RSSPage navigate with { state: { episode } }).
     Priority 2: look up the hardcoded episodes array by numeric id (existing
     behaviour — keeps all previously-working links working).                */
  const episode =
    location.state?.episode || episodes.find((ep) => ep.id === parseInt(id));

  if (!episode) {
    return (
      <div
        style={{
          padding: "2rem",
          color: "#f5f0e8",
          background: "#0d0d1a",
          minHeight: "100vh",
        }}
      >
        Episode not found.{" "}
        <span
          onClick={() => navigate("/")}
          style={{
            color: "#e8ff47",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Go home
        </span>
      </div>
    );
  }

  /* Normalise optional fields so the rest of the component never crashes on
     undefined.  RSS episodes have no transcript or insights arrays.         */
  const transcript = episode.transcript || [];
  const insights = episode.insights || [];

  /* ── AUDIO CONTROLS ── */
  function handlePlayPause() {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  function handleRewind() {
    audioRef.current.currentTime -= 10;
  }

  function handleFastForward() {
    audioRef.current.currentTime += 10;
  }

  /* Clicking a transcript line or marked moment jumps audio to that time */
  function handleTimestampClick(time) {
    audioRef.current.currentTime = time;
    audioRef.current.play();
    setIsPlaying(true);
  }

  /* Converts raw seconds into "0:00" format */
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  /* ── MARKED MOMENTS ──
     Toggles a transcript line in/out of the markedMoments array.
     If the line is already marked, clicking again removes it. */
  function toggleMark(line) {
    const alreadyMarked = markedMoments.find((m) => m.time === line.time);
    if (alreadyMarked) {
      /* Remove it from the array */
      setMarkedMoments(markedMoments.filter((m) => m.time !== line.time));
    } else {
      /* Add it to the array */
      setMarkedMoments([...markedMoments, line]);
    }
  }

  /* Returns true if a given transcript line is currently marked */
  function isMarked(line) {
    return markedMoments.some((m) => m.time === line.time);
  }

  /* ── NOTES ── */
  function handleSaveNotes() {
    setSavedNotes(notes);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  function handleClearNotes() {
    setNotes("");
    setSavedNotes("");
    setNoteSaved(false);
  }

  return (
    <div
      style={{ minHeight: "100vh", background: "#0d0d1a", color: "#f5f0e8" }}
    >
      {/* ── TOP NAV ── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 2.5rem",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
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
        <button
          onClick={() => navigate("/")}
          style={{
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            padding: "0.4rem 1.1rem",
            borderRadius: "20px",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          ← All Episodes
        </button>
      </nav>

      {/* ── HERO BANNER — full width image with gradient fade at bottom ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "420px",
          overflow: "hidden",
        }}
      >
        <img
          src={episode.image}
          alt={episode.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.4)",
          }}
        />
        {/* Gradient that melts the image into the page background */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "70%",
            background: "linear-gradient(to bottom, transparent, #0d0d1a)",
          }}
        />
        {/* Episode title overlaid on the hero */}
        <div
          style={{
            position: "absolute",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "860px",
            padding: "0 2rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "#e8ff47",
              fontSize: "0.75rem",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginBottom: "0.6rem",
            }}
          >
            Now Playing
          </p>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontFamily: "Georgia, serif",
              fontWeight: "normal",
              color: "#ffffff",
              marginBottom: "0.6rem",
              textShadow: "0 2px 30px rgba(0,0,0,0.8)",
            }}
          >
            {episode.title}
          </h1>
          {/* Description clamped to 3 lines — prevents long RSS descriptions flooding the hero */}
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: "1rem",
              maxWidth: "600px",
              margin: "0 auto",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {episode.description}
          </p>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={episode.audioSrc} />

      {/* ── PLAYER CONTROLS ── */}
      <div
        style={{
          maxWidth: "420px",
          margin: "-1rem auto 2.5rem",
          padding: "0 2rem",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "1.25rem 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
          }}
        >
          {/* Rewind */}
          <button onClick={handleRewind} style={ghostBtn}>
            <span style={{ fontSize: "1.1rem" }}>⏪</span>
            <span
              style={{
                fontSize: "0.65rem",
                display: "block",
                color: "#5a5a9a",
                marginTop: "2px",
              }}
            >
              10s
            </span>
          </button>

          {/* Play/Pause — glowing lime circle */}
          <button
            onClick={handlePlayPause}
            style={{
              width: "62px",
              height: "62px",
              borderRadius: "50%",
              background: "#e8ff47",
              border: "none",
              cursor: "pointer",
              fontSize: "1.3rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 30px rgba(232,255,71,0.4)",
              transition: "transform 0.1s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08)";
              e.currentTarget.style.boxShadow = "0 0 50px rgba(232,255,71,0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(232,255,71,0.4)";
            }}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          {/* Fast forward */}
          <button onClick={handleFastForward} style={ghostBtn}>
            <span style={{ fontSize: "1.1rem" }}>⏩</span>
            <span
              style={{
                fontSize: "0.65rem",
                display: "block",
                color: "#5a5a9a",
                marginTop: "2px",
              }}
            >
              10s
            </span>
          </button>
        </div>
      </div>

      {/* ── TAB BAR — switches between Transcript, Key Insights and Notes ── */}
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "0 2rem",
          marginBottom: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "4px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "12px",
            padding: "4px",
            width: "fit-content",
          }}
        >
          {/* Each tab button — highlight lime when active */}
          {[
            { key: "transcript", label: `📄 Transcript` },
            { key: "insights", label: `✨ Key Insights` },
            { key: "notes", label: `📝 My Notes` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: activeTab === tab.key ? "#e8ff47" : "transparent",
                color: activeTab === tab.key ? "#0d0d1a" : "#5a5a9a",
                border: "none",
                padding: "0.55rem 1.25rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: activeTab === tab.key ? "bold" : "normal",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT PANELS ── */}
      <div
        style={{ maxWidth: "960px", margin: "0 auto", padding: "0 2rem 4rem" }}
      >
        {/* ══ TRANSCRIPT PANEL ══ */}
        {activeTab === "transcript" && (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              padding: "1.75rem",
            }}
          >
            {/* Panel header */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h2
                style={{
                  fontSize: "1.1rem",
                  color: "#ffffff",
                  marginBottom: "0.3rem",
                  letterSpacing: "0.05em",
                }}
              >
                Transcript
              </h2>
              <p style={{ color: "#3a3a6a", fontSize: "0.82rem" }}>
                Click any line to jump there — bookmark a moment with 🔖
              </p>
            </div>

            {/* Empty state — shown when the episode has no transcript (e.g. RSS episodes) */}
            {transcript.length === 0 && (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "#3a3a6a",
                  border: "1px dashed rgba(255,255,255,0.06)",
                  borderRadius: "12px",
                }}
              >
                <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📄</p>
                <p style={{ fontSize: "0.9rem" }}>
                  No transcript available for this episode.
                </p>
              </div>
            )}

            {/* Marked Moments section — only shows if user has bookmarked at least one line */}
            {markedMoments.length > 0 && (
              <div
                style={{
                  background: "rgba(232,255,71,0.05)",
                  border: "1px solid rgba(232,255,71,0.15)",
                  borderRadius: "12px",
                  padding: "1rem 1.25rem",
                  marginBottom: "1.5rem",
                }}
              >
                <p
                  style={{
                    color: "#e8ff47",
                    fontSize: "0.72rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    marginBottom: "0.75rem",
                  }}
                >
                  🔖 Marked Moments
                </p>
                {/* List of bookmarked lines — click to jump to that time */}
                {markedMoments.map((m, i) => (
                  <div
                    key={i}
                    onClick={() => handleTimestampClick(m.time)}
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      alignItems: "center",
                      padding: "0.4rem 0",
                      cursor: "pointer",
                      borderTop:
                        i === 0 ? "none" : "1px solid rgba(232,255,71,0.07)",
                    }}
                  >
                    <span
                      style={{
                        background: "rgba(232,255,71,0.15)",
                        color: "#e8ff47",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        fontSize: "0.72rem",
                        fontFamily: "monospace",
                        flexShrink: 0,
                      }}
                    >
                      {formatTime(m.time)}
                    </span>
                    <p
                      style={{
                        color: "#aaaacc",
                        fontSize: "0.85rem",
                        margin: 0,
                      }}
                    >
                      {m.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Full transcript lines — rendered only when transcript data exists */}
            {transcript.map((line, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-start",
                  padding: "0.8rem",
                  marginBottom: "4px",
                  borderRadius: "10px",
                  /* Highlight the row lime if it's been marked */
                  background: isMarked(line)
                    ? "rgba(232,255,71,0.06)"
                    : "transparent",
                  border: isMarked(line)
                    ? "1px solid rgba(232,255,71,0.12)"
                    : "1px solid transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isMarked(line))
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (!isMarked(line))
                    e.currentTarget.style.background = "transparent";
                }}
              >
                {/* Timestamp badge — clicking jumps audio */}
                <span
                  onClick={() => handleTimestampClick(line.time)}
                  style={{
                    background: "rgba(232,255,71,0.1)",
                    color: "#e8ff47",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontFamily: "monospace",
                    whiteSpace: "nowrap",
                    marginTop: "3px",
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                >
                  {formatTime(line.time)}
                </span>

                {/* Spoken text — clicking also jumps audio */}
                <p
                  onClick={() => handleTimestampClick(line.time)}
                  style={{
                    color: "#9999bb",
                    fontSize: "0.95rem",
                    margin: 0,
                    lineHeight: 1.6,
                    flex: 1,
                    cursor: "pointer",
                  }}
                >
                  {line.text}
                </p>

                {/* Bookmark button — toggles this line in/out of markedMoments */}
                <button
                  onClick={() => toggleMark(line)}
                  title={
                    isMarked(line) ? "Remove bookmark" : "Bookmark this moment"
                  }
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1rem",
                    opacity: isMarked(line) ? 1 : 0.25,
                    transition: "opacity 0.15s",
                    flexShrink: 0,
                    padding: "0 0.25rem",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.opacity = isMarked(line)
                      ? "1"
                      : "0.25")
                  }
                >
                  🔖
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ══ KEY INSIGHTS PANEL ══ */}
        {activeTab === "insights" && (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              padding: "1.75rem",
            }}
          >
            {/* Panel header */}
            <div
              style={{
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "1.1rem",
                    color: "#ffffff",
                    marginBottom: "0.3rem",
                  }}
                >
                  Key Insights
                </h2>
                <p style={{ color: "#3a3a6a", fontSize: "0.82rem" }}>
                  The most important takeaways from this episode
                </p>
              </div>
              {/* AI badge — tells supervisor where AI will plug in */}
              <span
                style={{
                  background: "rgba(232,255,71,0.1)",
                  border: "1px solid rgba(232,255,71,0.2)",
                  color: "#e8ff47",
                  fontSize: "0.7rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "0.3rem 0.75rem",
                  borderRadius: "20px",
                }}
              >
                ✨ AI Generated
              </span>
            </div>

            {/* Empty state for RSS episodes that have no insights data */}
            {insights.length === 0 && (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "#3a3a6a",
                  border: "1px dashed rgba(255,255,255,0.06)",
                  borderRadius: "12px",
                  marginBottom: "1rem",
                }}
              >
                <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✨</p>
                <p style={{ fontSize: "0.9rem" }}>
                  No AI insights available for this episode yet.
                </p>
              </div>
            )}

            {/* Insights list — rendered only when insights data exists */}
            {insights.map((insight, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                  padding: "1.25rem",
                  marginBottom: "0.75rem",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "12px",
                }}
              >
                {/* Numbered circle */}
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "rgba(232,255,71,0.1)",
                    border: "1px solid rgba(232,255,71,0.2)",
                    color: "#e8ff47",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>
                <p
                  style={{
                    color: "#aaaacc",
                    fontSize: "0.95rem",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {insight}
                </p>
              </div>
            ))}

            {/* Placeholder note for supervisor */}
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem 1.25rem",
                background: "rgba(232,255,71,0.03)",
                border: "1px dashed rgba(232,255,71,0.15)",
                borderRadius: "10px",
              }}
            >
              <p style={{ color: "#3a3a6a", fontSize: "0.82rem", margin: 0 }}>
                🔌 <strong style={{ color: "#5a5a8a" }}>Coming soon:</strong>{" "}
                These insights will be generated automatically by AI based on
                the episode transcript once the backend is connected.
              </p>
            </div>
          </div>
        )}

        {/* ══ NOTES PANEL ══ */}
        {activeTab === "notes" && (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              padding: "1.75rem",
            }}
          >
            {/* Panel header */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h2
                style={{
                  fontSize: "1.1rem",
                  color: "#ffffff",
                  marginBottom: "0.3rem",
                }}
              >
                My Notes
              </h2>
              <p style={{ color: "#3a3a6a", fontSize: "0.82rem" }}>
                Your personal notes for this episode
              </p>
            </div>

            {/* Notes textarea */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type your notes here..."
              rows={8}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                color: "#f5f0e8",
                padding: "1.1rem",
                fontSize: "0.95rem",
                fontFamily: "Georgia, serif",
                resize: "vertical",
                outline: "none",
                lineHeight: 1.7,
                marginBottom: "1rem",
                boxSizing: "border-box",
              }}
            />

            {/* Save and Clear buttons */}
            <div
              style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
            >
              <button
                onClick={handleSaveNotes}
                style={{
                  background: "#e8ff47",
                  color: "#0a0a0a",
                  border: "none",
                  padding: "0.65rem 1.75rem",
                  borderRadius: "50px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                }}
              >
                Save Notes
              </button>
              <button onClick={handleClearNotes} style={ghostBtn}>
                Clear
              </button>
              {/* Flash confirmation — disappears after 2 seconds */}
              {noteSaved && (
                <span style={{ color: "#e8ff47", fontSize: "0.85rem" }}>
                  ✓ Saved!
                </span>
              )}
            </div>

            {/* Display saved notes below */}
            {savedNotes !== "" && (
              <div
                style={{
                  marginTop: "1.5rem",
                  background: "rgba(232,255,71,0.04)",
                  border: "1px solid rgba(232,255,71,0.1)",
                  borderRadius: "12px",
                  padding: "1.25rem",
                }}
              >
                <p
                  style={{
                    color: "#3a3a6a",
                    fontSize: "0.72rem",
                    letterSpacing: "0.1em",
                    marginBottom: "0.5rem",
                  }}
                >
                  SAVED NOTES
                </p>
                <p
                  style={{
                    color: "#9999bb",
                    fontSize: "0.95rem",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {savedNotes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <p
        style={{
          color: "#1e1e3a",
          fontSize: "0.75rem",
          textAlign: "center",
          paddingBottom: "2rem",
        }}
      >
        © 2025 PodPlayer
      </p>
    </div>
  );
}

/* Reusable ghost button style */
const ghostBtn = {
  background: "none",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#8888aa",
  padding: "0.5rem 0.9rem",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "0.85rem",
  textAlign: "center",
  lineHeight: 1.2,
};

export default PlayerPage;
