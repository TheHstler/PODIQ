import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useRef, useState } from "react";
import episodes from "../data/episodes";

function PlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  /* useLocation gives us access to state passed via navigate(..., { state }) */
  const location = useLocation();

  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [markedMoments, setMarkedMoments] = useState([]);
  const [activeTab, setActiveTab] = useState("transcript");

  /* ── EPISODE RESOLUTION ──────────────────────────────────────────────────
     Priority 1: episode passed via location.state (RSS episodes)
     Priority 2: look up hardcoded episodes array by id                   */
  const episode =
    location.state?.episode || episodes.find((ep) => ep.id === parseInt(id));

  /* ── AI FEATURE STATE ────────────────────────────────────────────────────
     transcript and insights start from episode data if it exists,
     otherwise empty arrays — user can generate them via AI button.       */
  const [transcript, setTranscript] = useState(episode?.transcript || []);
  const [insights, setInsights] = useState(episode?.insights || []);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState("");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  if (!episode) {
    return (
      <div style={{ padding: "2rem", color: "#f5f0e8", background: "#0d0d1a", minHeight: "100vh" }}>
        Episode not found.{" "}
        <span onClick={() => navigate("/")} style={{ color: "#e8ff47", cursor: "pointer", textDecoration: "underline" }}>
          Go home
        </span>
      </div>
    );
  }

  /* ── AUDIO CONTROLS ── */
  function handlePlayPause() {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      /* play() returns a Promise — wait for success before updating state */
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Playback prevented:", err);
            setIsPlaying(false);
          });
      }
    }
  }

  function handleRewind() {
    audioRef.current.currentTime -= 10;
  }

  function handleFastForward() {
    audioRef.current.currentTime += 10;
  }

  /* Clicking a transcript line jumps audio to that timestamp */
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

  /* ── MARKED MOMENTS ─────────────────────────────────────────────────────
     Toggles a transcript line in/out of the bookmarks array.            */
  function toggleMark(line) {
    const alreadyMarked = markedMoments.find((m) => m.time === line.time);
    if (alreadyMarked) {
      setMarkedMoments(markedMoments.filter((m) => m.time !== line.time));
    } else {
      setMarkedMoments([...markedMoments, line]);
    }
  }

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

  /* ── AI TRANSCRIPTION ────────────────────────────────────────────────────
     Calls our Express backend which sends audio to Hugging Face Whisper.
     Once transcript is back, automatically generates insights too.       */
  async function handleTranscribe() {
    console.log("Audio URL being sent:", episode.audioSrc);
    setIsTranscribing(true);
    setTranscribeError("");

    try {
      /* Step 1: Get transcript from Whisper via our backend */
      const response = await fetch("http://localhost:3001/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: episode.audioSrc }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      /* Update transcript panel with AI generated lines */
      setTranscript(data.transcript);

      /* Step 2: Automatically generate insights from the transcript text */
      setIsGeneratingInsights(true);
      const insightsResponse = await fetch("http://localhost:3001/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: data.fullText }),
      });
      const insightsData = await insightsResponse.json();
      if (insightsResponse.ok && insightsData.insights) {
        setInsights(insightsData.insights);
      }
    } catch (err) {
      setTranscribeError("Could not generate transcript: " + err.message);
    } finally {
      setIsTranscribing(false);
      setIsGeneratingInsights(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#f5f0e8" }}>

      {/* ── TOP NAV ── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.25rem 2.5rem", position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
      }}>
        <span onClick={() => navigate("/")} style={{ fontSize: "1.4rem", fontWeight: "bold", letterSpacing: "0.05em", color: "#e8ff47", fontFamily: "Georgia, serif", cursor: "pointer" }}>
          POD<span style={{ color: "#fff" }}>PLAYER</span>
        </span>
        <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "0.4rem 1.1rem", borderRadius: "20px", cursor: "pointer", fontSize: "0.85rem" }}>
          ← All Episodes
        </button>
      </nav>

      {/* ── HERO BANNER ── */}
      <div style={{ position: "relative", width: "100%", height: "420px", overflow: "hidden" }}>
        <img src={episode.image} alt={episode.title} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.4)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "70%", background: "linear-gradient(to bottom, transparent, #0d0d1a)" }} />
        <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "860px", padding: "0 2rem", textAlign: "center" }}>
          <p style={{ color: "#e8ff47", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Now Playing</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontFamily: "Georgia, serif", fontWeight: "normal", color: "#ffffff", marginBottom: "0.6rem", textShadow: "0 2px 30px rgba(0,0,0,0.8)" }}>
            {episode.title}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "1rem", maxWidth: "600px", margin: "0 auto", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {episode.description}
          </p>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={episode.audioSrc} />

      {/* ── PLAYER CONTROLS ── */}
      <div style={{ maxWidth: "420px", margin: "-1rem auto 2.5rem", padding: "0 2rem" }}>
        <div style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "1.25rem 2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
          <button onClick={handleRewind} style={ghostBtn}>
            <span style={{ fontSize: "1.1rem" }}>⏪</span>
            <span style={{ fontSize: "0.65rem", display: "block", color: "#5a5a9a", marginTop: "2px" }}>10s</span>
          </button>
          <button onClick={handlePlayPause} style={{ width: "62px", height: "62px", borderRadius: "50%", background: "#e8ff47", border: "none", cursor: "pointer", fontSize: "1.3rem", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(232,255,71,0.4)", transition: "transform 0.1s, box-shadow 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 0 50px rgba(232,255,71,0.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(232,255,71,0.4)"; }}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button onClick={handleFastForward} style={ghostBtn}>
            <span style={{ fontSize: "1.1rem" }}>⏩</span>
            <span style={{ fontSize: "0.65rem", display: "block", color: "#5a5a9a", marginTop: "2px" }}>10s</span>
          </button>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 2rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "4px", width: "fit-content" }}>
          {[
            { key: "transcript", label: "📄 Transcript" },
            { key: "insights",   label: "✨ Key Insights" },
            { key: "notes",      label: "📝 My Notes" },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ background: activeTab === tab.key ? "#e8ff47" : "transparent", color: activeTab === tab.key ? "#0d0d1a" : "#5a5a9a", border: "none", padding: "0.55rem 1.25rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: activeTab === tab.key ? "bold" : "normal", transition: "all 0.15s" }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT PANELS ── */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 2rem 4rem" }}>

        {/* ══ TRANSCRIPT PANEL ══ */}
        {activeTab === "transcript" && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "1.75rem" }}>

            {/* Panel header with AI generate button */}
            <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: "1.1rem", color: "#ffffff", marginBottom: "0.3rem", letterSpacing: "0.05em" }}>Transcript</h2>
                <p style={{ color: "#3a3a6a", fontSize: "0.82rem" }}>Click any line to jump there — bookmark a moment with 🔖</p>
              </div>

              {/* Generate button — only shows when no transcript exists yet */}
              {transcript.length === 0 && (
                <button
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                  style={{ background: isTranscribing ? "rgba(232,255,71,0.2)" : "#e8ff47", color: "#0d0d1a", border: "none", padding: "0.5rem 1rem", borderRadius: "20px", cursor: isTranscribing ? "not-allowed" : "pointer", fontSize: "0.8rem", fontWeight: "bold", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {isTranscribing ? "⏳ Transcribing..." : "✨ Generate Transcript"}
                </button>
              )}
            </div>

            {/* Error message if transcription failed */}
            {transcribeError && (
              <p style={{ color: "#ff6b6b", fontSize: "0.85rem", marginBottom: "1rem" }}>{transcribeError}</p>
            )}

            {/* Insights loading indicator */}
            {isGeneratingInsights && (
              <p style={{ color: "#e8ff47", fontSize: "0.85rem", marginBottom: "1rem" }}>✨ Generating key insights...</p>
            )}

            {/* Empty state — shown when no transcript exists */}
            {transcript.length === 0 && !isTranscribing && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#3a3a6a", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "12px" }}>
                <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📄</p>
                <p style={{ fontSize: "0.9rem" }}>No transcript yet — click "✨ Generate Transcript" above to create one using AI.</p>
              </div>
            )}

            {/* Loading state while transcribing */}
            {isTranscribing && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#5a5a9a", border: "1px dashed rgba(232,255,71,0.1)", borderRadius: "12px" }}>
                <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⏳</p>
                <p style={{ fontSize: "0.9rem" }}>Whisper AI is transcribing the audio — this takes about 30 seconds...</p>
              </div>
            )}

            {/* Marked Moments section */}
            {markedMoments.length > 0 && (
              <div style={{ background: "rgba(232,255,71,0.05)", border: "1px solid rgba(232,255,71,0.15)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
                <p style={{ color: "#e8ff47", fontSize: "0.72rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.75rem" }}>🔖 Marked Moments</p>
                {markedMoments.map((m, i) => (
                  <div key={i} onClick={() => handleTimestampClick(m.time)} style={{ display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.4rem 0", cursor: "pointer", borderTop: i === 0 ? "none" : "1px solid rgba(232,255,71,0.07)" }}>
                    <span style={{ background: "rgba(232,255,71,0.15)", color: "#e8ff47", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.72rem", fontFamily: "monospace", flexShrink: 0 }}>{formatTime(m.time)}</span>
                    <p style={{ color: "#aaaacc", fontSize: "0.85rem", margin: 0 }}>{m.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Full transcript lines */}
            {transcript.map((line, index) => (
              <div key={index}
                style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.8rem", marginBottom: "4px", borderRadius: "10px", background: isMarked(line) ? "rgba(232,255,71,0.06)" : "transparent", border: isMarked(line) ? "1px solid rgba(232,255,71,0.12)" : "1px solid transparent", transition: "background 0.15s" }}
                onMouseEnter={e => { if (!isMarked(line)) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!isMarked(line)) e.currentTarget.style.background = "transparent"; }}
              >
                <span onClick={() => handleTimestampClick(line.time)} style={{ background: "rgba(232,255,71,0.1)", color: "#e8ff47", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.72rem", fontFamily: "monospace", whiteSpace: "nowrap", marginTop: "3px", flexShrink: 0, cursor: "pointer" }}>
                  {formatTime(line.time)}
                </span>
                <p onClick={() => handleTimestampClick(line.time)} style={{ color: "#9999bb", fontSize: "0.95rem", margin: 0, lineHeight: 1.6, flex: 1, cursor: "pointer" }}>
                  {line.text}
                </p>
                <button onClick={() => toggleMark(line)} title={isMarked(line) ? "Remove bookmark" : "Bookmark this moment"}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", opacity: isMarked(line) ? 1 : 0.25, transition: "opacity 0.15s", flexShrink: 0, padding: "0 0.25rem" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={e => e.currentTarget.style.opacity = isMarked(line) ? "1" : "0.25"}
                >🔖</button>
              </div>
            ))}
          </div>
        )}

        {/* ══ KEY INSIGHTS PANEL ══ */}
        {activeTab === "insights" && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "1.75rem" }}>
            <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: "1.1rem", color: "#ffffff", marginBottom: "0.3rem" }}>Key Insights</h2>
                <p style={{ color: "#3a3a6a", fontSize: "0.82rem" }}>The most important takeaways from this episode</p>
              </div>
              <span style={{ background: "rgba(232,255,71,0.1)", border: "1px solid rgba(232,255,71,0.2)", color: "#e8ff47", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.3rem 0.75rem", borderRadius: "20px" }}>
                ✨ AI Generated
              </span>
            </div>

            {/* Empty state — tells user to generate transcript first */}
            {insights.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#3a3a6a", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "12px", marginBottom: "1rem" }}>
                <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✨</p>
                <p style={{ fontSize: "0.9rem" }}>No insights yet — go to the Transcript tab and click "Generate Transcript" first.</p>
              </div>
            )}

            {/* Insights list */}
            {insights.map((insight, index) => (
              <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", padding: "1.25rem", marginBottom: "0.75rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(232,255,71,0.1)", border: "1px solid rgba(232,255,71,0.2)", color: "#e8ff47", fontSize: "0.75rem", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {index + 1}
                </div>
                <p style={{ color: "#aaaacc", fontSize: "0.95rem", margin: 0, lineHeight: 1.6 }}>{insight}</p>
              </div>
            ))}

            {/* Supervisor note */}
            <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", background: "rgba(232,255,71,0.03)", border: "1px dashed rgba(232,255,71,0.15)", borderRadius: "10px" }}>
              <p style={{ color: "#3a3a6a", fontSize: "0.82rem", margin: 0 }}>
                🔌 <strong style={{ color: "#5a5a8a" }}>AI Powered:</strong> Insights are generated from the episode transcript using Hugging Face Flan-T5.
              </p>
            </div>
          </div>
        )}

        {/* ══ NOTES PANEL ══ */}
        {activeTab === "notes" && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "1.75rem" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", color: "#ffffff", marginBottom: "0.3rem" }}>My Notes</h2>
              <p style={{ color: "#3a3a6a", fontSize: "0.82rem" }}>Your personal notes for this episode</p>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Type your notes here..." rows={8}
              style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", color: "#f5f0e8", padding: "1.1rem", fontSize: "0.95rem", fontFamily: "Georgia, serif", resize: "vertical", outline: "none", lineHeight: 1.7, marginBottom: "1rem", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button onClick={handleSaveNotes} style={{ background: "#e8ff47", color: "#0a0a0a", border: "none", padding: "0.65rem 1.75rem", borderRadius: "50px", cursor: "pointer", fontSize: "0.9rem", fontWeight: "bold" }}>
                Save Notes
              </button>
              <button onClick={handleClearNotes} style={ghostBtn}>Clear</button>
              {noteSaved && <span style={{ color: "#e8ff47", fontSize: "0.85rem" }}>✓ Saved!</span>}
            </div>
            {savedNotes !== "" && (
              <div style={{ marginTop: "1.5rem", background: "rgba(232,255,71,0.04)", border: "1px solid rgba(232,255,71,0.1)", borderRadius: "12px", padding: "1.25rem" }}>
                <p style={{ color: "#3a3a6a", fontSize: "0.72rem", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>SAVED NOTES</p>
                <p style={{ color: "#9999bb", fontSize: "0.95rem", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{savedNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <p style={{ color: "#1e1e3a", fontSize: "0.75rem", textAlign: "center", paddingBottom: "2rem" }}>
        © 2025 PodPlayer
      </p>
    </div>
  );
}

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