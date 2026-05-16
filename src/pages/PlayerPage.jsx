import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useRef, useState } from "react";
import episodes from "../data/episodes";

function PlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const audioRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [markedMoments, setMarkedMoments] = useState([]);
  const [activeTab, setActiveTab] = useState("transcript");

  const episode =
    location.state?.episode || episodes.find((ep) => ep.id === parseInt(id));

  const [transcript, setTranscript] = useState(episode?.transcript || []);
  const [insights, setInsights] = useState(episode?.insights || []);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState("");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  if (!episode) {
    return (
      <div
        style={{
          padding: "2rem",
          color: "#1a1a2e",
          background: "#f8f7f4",
          minHeight: "100vh",
        }}
      >
        Episode not found.{" "}
        <span
          onClick={() => navigate("/")}
          style={{ color: "#6c47ff", cursor: "pointer" }}
        >
          Go home
        </span>
      </div>
    );
  }

  function handlePlayPause() {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  }

  function handleRewind() {
    audioRef.current.currentTime -= 10;
  }
  function handleFastForward() {
    audioRef.current.currentTime += 10;
  }

  function handleTimestampClick(time) {
    audioRef.current.currentTime = time;
    audioRef.current.play();
    setIsPlaying(true);
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

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

  async function handleTranscribe() {
    setIsTranscribing(true);
    setTranscribeError("");
    try {
      const response = await fetch("http://localhost:3001/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: episode.audioSrc,
          title: episode.title,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTranscript(data.transcript);
      setIsGeneratingInsights(true);
      const insightsResponse = await fetch(
        "http://localhost:3001/api/insights",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: data.fullText }),
        },
      );
      const insightsData = await insightsResponse.json();
      if (insightsResponse.ok && insightsData.insights)
        setInsights(insightsData.insights);
    } catch (err) {
      setTranscribeError("Could not generate transcript: " + err.message);
    } finally {
      setIsTranscribing(false);
      setIsGeneratingInsights(false);
    }
  }

  async function handleGenerateInsights() {
    setIsGeneratingInsights(true);
    setTranscribeError("");
    try {
      const textToAnalyse =
        transcript.length > 0
          ? transcript.map((l) => l.text).join(" ")
          : episode.description;
      const insightsResponse = await fetch(
        "http://localhost:3001/api/insights",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: textToAnalyse }),
        },
      );
      const insightsData = await insightsResponse.json();
      if (!insightsResponse.ok) throw new Error(insightsData.error);
      if (insightsData.insights) setInsights(insightsData.insights);
    } catch (err) {
      setTranscribeError("Could not generate insights: " + err.message);
    } finally {
      setIsGeneratingInsights(false);
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

      {/* ── HERO ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "340px",
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
            filter: "brightness(0.35) saturate(0.8)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, transparent 30%, #f8f7f4 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "720px",
            padding: "0 2rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "#6c47ff",
              fontSize: "0.72rem",
              fontWeight: "700",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            Now Playing
          </p>
          <h1
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
              fontFamily: "Georgia, serif",
              fontWeight: "normal",
              color: "#fff",
              marginBottom: "0.5rem",
              textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            }}
          >
            {episode.title}
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.9rem",
              maxWidth: "560px",
              margin: "0 auto",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {episode.description}
          </p>
        </div>
      </div>

      <audio ref={audioRef} src={episode.audioSrc} />

      {/* ── PLAYER CONTROLS ── */}
      <div
        style={{
          maxWidth: "400px",
          margin: "-1rem auto 2rem",
          padding: "0 2rem",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "1.25rem 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            boxShadow: "0 4px 24px rgba(108,71,255,0.1)",
            border: "1px solid #ebebeb",
          }}
        >
          {/* Rewind */}
          <button onClick={handleRewind} style={ctrlBtn}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#888"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
            </svg>
            <span
              style={{
                fontSize: "0.6rem",
                color: "#bbb",
                display: "block",
                marginTop: "2px",
              }}
            >
              10s
            </span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "#6c47ff",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 20px rgba(108,71,255,0.35)",
              transition: "transform 0.1s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.06)";
              e.currentTarget.style.boxShadow =
                "0 6px 28px rgba(108,71,255,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow =
                "0 4px 20px rgba(108,71,255,0.35)";
            }}
          >
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Fast forward */}
          <button onClick={handleFastForward} style={ctrlBtn}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#888"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-.49-3.51" />
            </svg>
            <span
              style={{
                fontSize: "0.6rem",
                color: "#bbb",
                display: "block",
                marginTop: "2px",
              }}
            >
              10s
            </span>
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div
        style={{ maxWidth: "860px", margin: "0 auto", padding: "0 2rem 1rem" }}
      >
        <div
          style={{
            display: "flex",
            gap: "2px",
            background: "#ebebeb",
            borderRadius: "12px",
            padding: "3px",
            width: "fit-content",
          }}
        >
          {[
            { key: "transcript", label: "Transcript" },
            { key: "insights", label: "Key Insights" },
            { key: "notes", label: "My Notes" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: activeTab === tab.key ? "#fff" : "transparent",
                color: activeTab === tab.key ? "#1a1a2e" : "#aaa",
                border: "none",
                padding: "0.5rem 1.25rem",
                borderRadius: "9px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: activeTab === tab.key ? "600" : "400",
                boxShadow:
                  activeTab === tab.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── PANELS ── */}
      <div
        style={{ maxWidth: "860px", margin: "0 auto", padding: "0 2rem 4rem" }}
      >
        {/* TRANSCRIPT */}
        {activeTab === "transcript" && (
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "1.75rem",
              border: "1px solid #ebebeb",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
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
                <h2
                  style={{
                    fontSize: "1rem",
                    fontWeight: "700",
                    color: "#1a1a2e",
                    marginBottom: "0.2rem",
                  }}
                >
                  Transcript
                </h2>
                <p style={{ color: "#bbb", fontSize: "0.8rem" }}>
                  Click any line to jump there — bookmark with the flag icon
                </p>
              </div>
              {transcript.length === 0 && (
                <button
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                  style={{
                    background: isTranscribing ? "#f0edff" : "#6c47ff",
                    color: isTranscribing ? "#6c47ff" : "#fff",
                    border: "none",
                    padding: "0.5rem 1.1rem",
                    borderRadius: "8px",
                    cursor: isTranscribing ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    flexShrink: 0,
                  }}
                >
                  {isTranscribing ? "Generating..." : "Generate Transcript"}
                </button>
              )}
            </div>

            {transcribeError && (
              <p
                style={{
                  color: "#e53e3e",
                  fontSize: "0.85rem",
                  marginBottom: "1rem",
                }}
              >
                {transcribeError}
              </p>
            )}

            {isTranscribing && (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "#aaa",
                  background: "#fafafa",
                  borderRadius: "10px",
                }}
              >
                <p style={{ fontSize: "0.9rem" }}>
                  AI is transcribing the audio — this takes about 1-2 minutes...
                </p>
              </div>
            )}

            {transcript.length === 0 && !isTranscribing && (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "#bbb",
                  background: "#fafafa",
                  borderRadius: "10px",
                }}
              >
                <p style={{ fontSize: "0.9rem" }}>
                  No transcript yet — click Generate Transcript to create one.
                </p>
              </div>
            )}

            {/* Marked moments */}
            {markedMoments.length > 0 && (
              <div
                style={{
                  background: "#f8f7ff",
                  border: "1px solid #e0d9ff",
                  borderRadius: "10px",
                  padding: "1rem 1.25rem",
                  marginBottom: "1.25rem",
                }}
              >
                <p
                  style={{
                    color: "#6c47ff",
                    fontSize: "0.72rem",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: "0.75rem",
                  }}
                >
                  Bookmarked Moments
                </p>
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
                      borderTop: i === 0 ? "none" : "1px solid #ede9ff",
                    }}
                  >
                    <span
                      style={{
                        background: "#ede9ff",
                        color: "#6c47ff",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.72rem",
                        fontFamily: "monospace",
                        flexShrink: 0,
                      }}
                    >
                      {formatTime(m.time)}
                    </span>
                    <p
                      style={{ color: "#555", fontSize: "0.85rem", margin: 0 }}
                    >
                      {m.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Transcript lines */}
            {transcript.map((line, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-start",
                  padding: "0.7rem 0.75rem",
                  marginBottom: "2px",
                  borderRadius: "8px",
                  background: isMarked(line) ? "#f8f7ff" : "transparent",
                  border: isMarked(line)
                    ? "1px solid #e0d9ff"
                    : "1px solid transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isMarked(line))
                    e.currentTarget.style.background = "#fafafa";
                }}
                onMouseLeave={(e) => {
                  if (!isMarked(line))
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  onClick={() => handleTimestampClick(line.time)}
                  style={{
                    background: "#f0edff",
                    color: "#6c47ff",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontFamily: "monospace",
                    whiteSpace: "nowrap",
                    marginTop: "3px",
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                >
                  {formatTime(line.time)}
                </span>
                <p
                  onClick={() => handleTimestampClick(line.time)}
                  style={{
                    color: "#444",
                    fontSize: "0.92rem",
                    margin: 0,
                    lineHeight: 1.6,
                    flex: 1,
                    cursor: "pointer",
                  }}
                >
                  {line.text}
                </p>
                <button
                  onClick={() => toggleMark(line)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 0.25rem",
                    flexShrink: 0,
                    opacity: isMarked(line) ? 1 : 0.2,
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.opacity = isMarked(line)
                      ? "1"
                      : "0.2")
                  }
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill={isMarked(line) ? "#6c47ff" : "none"}
                    stroke="#6c47ff"
                    strokeWidth="2"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* KEY INSIGHTS */}
        {activeTab === "insights" && (
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "1.75rem",
              border: "1px solid #ebebeb",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
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
                <h2
                  style={{
                    fontSize: "1rem",
                    fontWeight: "700",
                    color: "#1a1a2e",
                    marginBottom: "0.2rem",
                  }}
                >
                  Key Insights
                </h2>
                <p style={{ color: "#bbb", fontSize: "0.8rem" }}>
                  The most important takeaways from this episode
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    background: "#f0edff",
                    color: "#6c47ff",
                    fontSize: "0.7rem",
                    fontWeight: "600",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "20px",
                    letterSpacing: "0.05em",
                  }}
                >
                  AI
                </span>
                <button
                  onClick={handleGenerateInsights}
                  disabled={isGeneratingInsights}
                  style={{
                    background: isGeneratingInsights ? "#f0edff" : "#6c47ff",
                    color: isGeneratingInsights ? "#6c47ff" : "#fff",
                    border: "none",
                    padding: "0.5rem 1.1rem",
                    borderRadius: "8px",
                    cursor: isGeneratingInsights ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                  }}
                >
                  {isGeneratingInsights ? "Generating..." : "Generate Insights"}
                </button>
              </div>
            </div>

            {insights.length === 0 && !isGeneratingInsights && (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "#bbb",
                  background: "#fafafa",
                  borderRadius: "10px",
                }}
              >
                <p style={{ fontSize: "0.9rem" }}>
                  Click Generate Insights to get AI powered takeaways.
                </p>
              </div>
            )}

            {isGeneratingInsights && (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "#aaa",
                  background: "#fafafa",
                  borderRadius: "10px",
                }}
              >
                <p style={{ fontSize: "0.9rem" }}>Analysing the episode...</p>
              </div>
            )}

            {insights.map((insight, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                  padding: "1.1rem 1.25rem",
                  marginBottom: "0.5rem",
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: "#f0edff",
                    color: "#6c47ff",
                    fontSize: "0.75rem",
                    fontWeight: "700",
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
                    color: "#444",
                    fontSize: "0.92rem",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {insight}
                </p>
              </div>
            ))}

            <div
              style={{
                marginTop: "1.25rem",
                padding: "0.9rem 1.1rem",
                background: "#f8f7ff",
                borderRadius: "8px",
                border: "1px solid #e0d9ff",
              }}
            >
              <p style={{ color: "#9b84ff", fontSize: "0.78rem", margin: 0 }}>
                Insights are extracted from the episode transcript using AI text
                analysis.
              </p>
            </div>
          </div>
        )}

        {/* NOTES */}
        {activeTab === "notes" && (
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "1.75rem",
              border: "1px solid #ebebeb",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ marginBottom: "1.25rem" }}>
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: "700",
                  color: "#1a1a2e",
                  marginBottom: "0.2rem",
                }}
              >
                My Notes
              </h2>
              <p style={{ color: "#bbb", fontSize: "0.8rem" }}>
                Your personal notes for this episode
              </p>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type your notes here..."
              rows={8}
              style={{
                width: "100%",
                background: "#fafafa",
                border: "1px solid #ebebeb",
                borderRadius: "10px",
                color: "#1a1a2e",
                padding: "1rem",
                fontSize: "0.92rem",
                fontFamily: "Georgia, serif",
                resize: "vertical",
                outline: "none",
                lineHeight: 1.7,
                marginBottom: "1rem",
                boxSizing: "border-box",
              }}
            />
            <div
              style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
            >
              <button
                onClick={handleSaveNotes}
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
                Save Notes
              </button>
              <button
                onClick={handleClearNotes}
                style={{
                  background: "none",
                  border: "1px solid #e0e0e0",
                  color: "#888",
                  padding: "0.6rem 1.1rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.88rem",
                }}
              >
                Clear
              </button>
              {noteSaved && (
                <span
                  style={{
                    color: "#6c47ff",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                  }}
                >
                  Saved!
                </span>
              )}
            </div>
            {savedNotes !== "" && (
              <div
                style={{
                  marginTop: "1.25rem",
                  background: "#f8f7ff",
                  border: "1px solid #e0d9ff",
                  borderRadius: "10px",
                  padding: "1.1rem",
                }}
              >
                <p
                  style={{
                    color: "#9b84ff",
                    fontSize: "0.72rem",
                    fontWeight: "700",
                    letterSpacing: "0.08em",
                    marginBottom: "0.5rem",
                  }}
                >
                  SAVED NOTES
                </p>
                <p
                  style={{
                    color: "#555",
                    fontSize: "0.9rem",
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
          color: "#ccc",
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

const ctrlBtn = {
  background: "none",
  border: "none",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "0.5rem",
  borderRadius: "8px",
  color: "#888",
};

export default PlayerPage;
