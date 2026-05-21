import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import episodes from "../data/episodes";

function PlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const audioRef = useRef(null);

  /* ── PLAYER STATE ── */
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  /* ── NOTES STATE ── */
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState([]);
  const [noteSaved, setNoteSaved] = useState(false);

  /* ── BOOKMARKS STATE ── */
  // Each bookmark: { time, text, type: "important"|"confusing", aiNote, userNote }
  const [markedMoments, setMarkedMoments] = useState([]);
  // Which line is showing the mark-type picker
  const [markingLine, setMarkingLine] = useState(null);
  // Which bookmark is being edited
  const [editingMark, setEditingMark] = useState(null);

  /* ── TABS & PANELS ── */
  const [activeTab, setActiveTab] = useState("transcript");
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);

  /* ── TRANSCRIPT & INSIGHTS STATE ── */
  const [transcript, setTranscript] = useState([]);
  const [insights, setInsights] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState("");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [summary, setSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);

  /* ── TOOLTIP / SIDE CARD STATE ── */
  // hoveredInsight: shows on hover
  const [hoveredInsight, setHoveredInsight] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  // pinnedInsight: clicked — shows in side panel
  const [pinnedInsight, setPinnedInsight] = useState(null);

  /* ── WORD SEARCH STATE ── */
  const [wordSearch, setWordSearch] = useState("");
  const [wordDefinition, setWordDefinition] = useState(null);
  const [isSearchingWord, setIsSearchingWord] = useState(false);
  const [wordSearchError, setWordSearchError] = useState("");

  /* ── SUGGESTED PODCASTS STATE ── */
  const [suggested, setSuggested] = useState([]);
  const [showSuggested, setShowSuggested] = useState(false);
  const [suggestedHidden, setSuggestedHidden] = useState(false);

  const episode =
    location.state?.episode || episodes.find((ep) => ep.id === parseInt(id));

  /* ── AUTO GENERATE ON LOAD ── */
  useEffect(() => {
    if (autoLoaded) return;
    if (!episode?.audioSrc) return;
    if (transcript.length > 0) return;
    setAutoLoaded(true);
    setTimeout(() => {
      handleTranscribe();
    }, 1000);
  }, [episode]);

  /* ── TRACK AUDIO PROGRESS ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onTimeUpdate() {
      setCurrentTime(audio.currentTime);
    }
    function onDurationChange() {
      setDuration(audio.duration || 0);
    }
    function onEnded() {
      setIsPlaying(false);
      // Show suggested podcasts when episode finishes
      setShowSuggested(true);
      fetchSuggestedPodcasts();
    }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  /* ── LOAD SAVED NOTES FOR THIS EPISODE ── */
  useEffect(() => {
    if (!episode) return;
    const key = `notes_${episode.guid || episode.id}`;
    const stored = localStorage.getItem(key);
    if (stored) setSavedNotes(JSON.parse(stored));
  }, [episode]);

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

  /* ── AUDIO CONTROLS ── */
  function handlePlayPause() {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
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

  function handleProgressClick(e) {
    // Click on progress bar to seek
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  /* ── BOOKMARK WITH TYPE ── */
  async function handleMark(line, type) {
    // Check if already marked
    const existing = markedMoments.find((m) => m.time === line.time);
    if (existing) {
      // Remove if same type, else update type
      if (existing.type === type) {
        setMarkedMoments(markedMoments.filter((m) => m.time !== line.time));
      } else {
        setMarkedMoments(
          markedMoments.map((m) => (m.time === line.time ? { ...m, type } : m)),
        );
      }
      setMarkingLine(null);
      return;
    }

    // Generate AI note for this bookmark
    const aiNote = await generateBookmarkNote(line, type);
    const newMark = {
      time: line.time,
      text: line.text,
      type,
      aiNote,
      userNote: "",
    };
    setMarkedMoments([...markedMoments, newMark]);
    setMarkingLine(null);
  }

  async function generateBookmarkNote(line, type) {
    // Call Claude to generate a short contextual note about this moment
    try {
      const res = await fetch("http://localhost:3001/api/bookmark-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: line.text,
          time: line.time,
          type,
          episodeTitle: episode.title,
        }),
      });
      const data = await res.json();
      return data.note || "";
    } catch {
      return "";
    }
  }

  function isMarked(line) {
    return markedMoments.find((m) => m.time === line.time) || null;
  }

  /* ── SAVE NOTES ── */
  function handleSaveNotes() {
    if (!notes.trim()) return;
    const key = `notes_${episode.guid || episode.id}`;
    const newNote = {
      id: Date.now(),
      text: notes,
      timestamp: currentTime,
      writtenAt: new Date().toLocaleString("en-GB"),
      episodeTitle: episode.title,
      episodeGuid: episode.guid || episode.id,
      podcastImage: episode.image,
    };
    const updated = [...savedNotes, newNote];
    setSavedNotes(updated);
    localStorage.setItem(key, JSON.stringify(updated));

    // Also save to global notes library
    const library = JSON.parse(localStorage.getItem("notes_library") || "[]");
    library.push(newNote);
    localStorage.setItem("notes_library", JSON.stringify(library));

    setNotes("");
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  function handleDeleteNote(noteId) {
    const key = `notes_${episode.guid || episode.id}`;
    const updated = savedNotes.filter((n) => n.id !== noteId);
    setSavedNotes(updated);
    localStorage.setItem(key, JSON.stringify(updated));

    // Remove from library too
    const library = JSON.parse(localStorage.getItem("notes_library") || "[]");
    const updatedLibrary = library.filter((n) => n.id !== noteId);
    localStorage.setItem("notes_library", JSON.stringify(updatedLibrary));
  }

  /* ── WORD DEFINITION SEARCH ── */
  async function handleWordSearch(e) {
    e.preventDefault();
    if (!wordSearch.trim()) return;
    setIsSearchingWord(true);
    setWordDefinition(null);
    setWordSearchError("");
    try {
      // Free dictionary API — no backend needed
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(wordSearch.trim())}`,
      );
      if (!res.ok) throw new Error("Word not found");
      const data = await res.json();
      const entry = data[0];
      const meaning = entry.meanings[0];
      setWordDefinition({
        word: entry.word,
        phonetic: entry.phonetic || "",
        partOfSpeech: meaning?.partOfSpeech || "",
        definition:
          meaning?.definitions[0]?.definition || "No definition found.",
        example: meaning?.definitions[0]?.example || "",
      });
    } catch {
      setWordSearchError("Could not find a definition for that word.");
    } finally {
      setIsSearchingWord(false);
    }
  }

  /* ── HIGHLIGHT ENTITIES IN TRANSCRIPT LINE ── */
  function renderHighlightedLine(text) {
    if (!insights || insights.length === 0) return text;

    const sorted = [...insights].sort((a, b) => b.name.length - a.name.length);
    let remaining = text;
    const parts = [];
    let keyCounter = 0;

    while (remaining.length > 0) {
      let earliestIndex = -1;
      let matchedInsight = null;
      let matchedName = "";

      for (const insight of sorted) {
        const idx = remaining.toLowerCase().indexOf(insight.name.toLowerCase());
        if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) {
          earliestIndex = idx;
          matchedInsight = insight;
          matchedName = remaining.slice(idx, idx + insight.name.length);
        }
      }

      if (matchedInsight === null) {
        parts.push(<span key={keyCounter++}>{remaining}</span>);
        break;
      }

      if (earliestIndex > 0) {
        parts.push(
          <span key={keyCounter++}>{remaining.slice(0, earliestIndex)}</span>,
        );
      }

      const insight = matchedInsight;
      parts.push(
        <span
          key={keyCounter++}
          onMouseEnter={(e) => {
            setHoveredInsight(insight);
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltipPos({
              x: rect.left,
              y: rect.bottom + window.scrollY + 6,
            });
          }}
          onMouseLeave={() => setHoveredInsight(null)}
          onClick={(e) => {
            e.stopPropagation();
            // Pin to side panel — toggle off if same
            setPinnedInsight((prev) =>
              prev?.name === insight.name ? null : insight,
            );
          }}
          style={{
            background: "rgba(108,71,255,0.08)",
            borderRadius: "3px",
            padding: "0 2px",
            cursor: "pointer",
            borderBottom: "2px solid #6c47ff",
            color: "#4a2fcc",
            fontWeight: "500",
            position: "relative",
          }}
        >
          {matchedName}
        </span>,
      );

      remaining = remaining.slice(earliestIndex + matchedName.length);
    }

    return parts;
  }

  /* ── TRANSCRIBE ── */
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
          body: JSON.stringify({
            transcript: data.fullText,
            lines: data.transcript,
          }),
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

  /* ── GENERATE SUMMARY ── */
  async function handleGenerateSummary() {
    setIsGeneratingSummary(true);
    try {
      const markedText = markedMoments
        .map((m) => `[${formatTime(m.time)}] (${m.type}) ${m.text}`)
        .join("\n");
      const fullText = transcript.map((l) => l.text).join(" ");
      const res = await fetch("http://localhost:3001/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: fullText,
          markedMoments: markedText,
          episodeTitle: episode.title,
        }),
      });
      const data = await res.json();
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      console.error("Summary error:", err);
    } finally {
      setIsGeneratingSummary(false);
    }
  }

  /* ── REGENERATE INSIGHTS ── */
  async function handleGenerateInsights() {
    setIsGeneratingInsights(true);
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
          body: JSON.stringify({
            transcript: textToAnalyse,
            lines: transcript,
          }),
        },
      );
      const insightsData = await insightsResponse.json();
      if (insightsData.insights) setInsights(insightsData.insights);
    } catch (err) {
      console.error("Insights error:", err);
    } finally {
      setIsGeneratingInsights(false);
    }
  }

  /* ── FETCH SUGGESTED PODCASTS ── */
  async function fetchSuggestedPodcasts() {
    try {
      const res = await fetch(
        `http://localhost:3001/api/search?q=${encodeURIComponent(episode.title)}`,
      );
      const data = await res.json();
      if (data.podcasts) setSuggested(data.podcasts.slice(0, 4));
    } catch {
      // Silently fail — suggested is a bonus feature
    }
  }

  /* ── BOOKMARK COLOUR BY TYPE ── */
  function markColor(type) {
    if (type === "important") return "#f59e0b";
    if (type === "confusing") return "#ef4444";
    return "#6c47ff";
  }

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
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
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {/* Notes Library link */}
          <button
            onClick={() => navigate("/notes")}
            style={{
              background: "#f0edff",
              border: "none",
              color: "#6c47ff",
              padding: "0.45rem 1.1rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: "600",
            }}
          >
            My Notes
          </button>
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
        </div>
      </nav>

      {/* ── HERO ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "300px",
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
              fontSize: "clamp(1.4rem, 4vw, 2.4rem)",
              fontFamily: "Georgia, serif",
              fontWeight: "normal",
              color: "#fff",
              marginBottom: "0.4rem",
              textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            }}
          >
            {episode.title}
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.85rem",
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
          maxWidth: "500px",
          margin: "-1rem auto 1.5rem",
          padding: "0 2rem",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "1.25rem 2rem",
            boxShadow: "0 4px 24px rgba(108,71,255,0.1)",
            border: "1px solid #ebebeb",
          }}
        >
          {/* ── PROGRESS BAR (YouTube-style) ── */}
          <div style={{ marginBottom: "1rem" }}>
            {/* Clickable track */}
            <div
              onClick={handleProgressClick}
              style={{
                width: "100%",
                height: "4px",
                background: "#f0f0f0",
                borderRadius: "2px",
                cursor: "pointer",
                position: "relative",
                marginBottom: "0.4rem",
              }}
            >
              {/* Filled portion */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  background: "#6c47ff",
                  borderRadius: "2px",
                  transition: "width 0.1s linear",
                }}
              />
              {/* Scrubber dot */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  transform: "translate(-50%, -50%)",
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: "#6c47ff",
                  boxShadow: "0 0 0 2px #fff",
                }}
              />
            </div>
            {/* Time labels */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span
                style={{
                  color: "#aaa",
                  fontSize: "0.72rem",
                  fontFamily: "monospace",
                }}
              >
                {formatTime(currentTime)}
              </span>
              <span
                style={{
                  color: "#aaa",
                  fontSize: "0.72rem",
                  fontFamily: "monospace",
                }}
              >
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Playback buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.5rem",
            }}
          >
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
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
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
      </div>

      {/* ── GENERATING INDICATOR ── */}
      {(isTranscribing || isGeneratingInsights) && (
        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            padding: "0 2rem 1rem",
          }}
        >
          <div
            style={{
              background: "#f0edff",
              borderRadius: "10px",
              padding: "0.75rem 1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#6c47ff",
                animation: "pulse 1.2s infinite",
              }}
            />
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
            <p style={{ color: "#6c47ff", fontSize: "0.85rem", margin: 0 }}>
              {isTranscribing
                ? "Generating transcript in background — this takes 1-2 minutes..."
                : "Generating insights from transcript..."}
            </p>
          </div>
        </div>
      )}

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
            { key: "insights", label: "Summary & Insights" },
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
        {/* ══ TRANSCRIPT PANEL ══ */}
        {activeTab === "transcript" && (
          /* Outer wrapper — flex row so side card can sit next to transcript */
          <div
            style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}
          >
            {/* Main transcript card — shrinks when side panel is open */}
            <div
              style={{
                flex: 1,
                background: "#fff",
                borderRadius: "16px",
                padding: "1.75rem",
                border: "1px solid #ebebeb",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                minWidth: 0,
              }}
            >
              {/* ── WORD SEARCH BOX ── */}
              <div style={{ marginBottom: "1.25rem" }}>
                <p
                  style={{
                    color: "#aaa",
                    fontSize: "0.72rem",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: "0.5rem",
                  }}
                >
                  Word Search
                </p>
                <form
                  onSubmit={handleWordSearch}
                  style={{ display: "flex", gap: "0.5rem" }}
                >
                  <input
                    value={wordSearch}
                    onChange={(e) => setWordSearch(e.target.value)}
                    placeholder="Type a word to define..."
                    style={{
                      flex: 1,
                      border: "1px solid #ebebeb",
                      borderRadius: "8px",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.85rem",
                      background: "#fafafa",
                      color: "#1a1a2e",
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: "#6c47ff",
                      color: "#fff",
                      border: "none",
                      padding: "0.5rem 1rem",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      fontWeight: "600",
                    }}
                  >
                    {isSearchingWord ? "..." : "Define"}
                  </button>
                </form>

                {/* Definition result */}
                {wordDefinition && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      background: "#f8f7ff",
                      border: "1px solid #e0d9ff",
                      borderRadius: "10px",
                      padding: "0.9rem 1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "0.5rem",
                        marginBottom: "0.3rem",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "700",
                          color: "#1a1a2e",
                          fontSize: "0.95rem",
                        }}
                      >
                        {wordDefinition.word}
                      </span>
                      <span style={{ color: "#aaa", fontSize: "0.75rem" }}>
                        {wordDefinition.phonetic}
                      </span>
                      <span
                        style={{
                          background: "#f0edff",
                          color: "#6c47ff",
                          fontSize: "0.65rem",
                          fontWeight: "600",
                          padding: "0.1rem 0.45rem",
                          borderRadius: "20px",
                        }}
                      >
                        {wordDefinition.partOfSpeech}
                      </span>
                    </div>
                    <p
                      style={{
                        color: "#444",
                        fontSize: "0.85rem",
                        lineHeight: 1.5,
                        marginBottom: wordDefinition.example ? "0.3rem" : 0,
                      }}
                    >
                      {wordDefinition.definition}
                    </p>
                    {wordDefinition.example && (
                      <p
                        style={{
                          color: "#999",
                          fontSize: "0.78rem",
                          fontStyle: "italic",
                        }}
                      >
                        "{wordDefinition.example}"
                      </p>
                    )}
                    <button
                      onClick={() => {
                        setWordDefinition(null);
                        setWordSearch("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#bbb",
                        fontSize: "0.72rem",
                        cursor: "pointer",
                        marginTop: "0.3rem",
                        padding: 0,
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                {wordSearchError && (
                  <p
                    style={{
                      color: "#ef4444",
                      fontSize: "0.8rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    {wordSearchError}
                  </p>
                )}
              </div>

              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid #f0f0f0",
                  marginBottom: "1.25rem",
                }}
              />

              {/* Transcript header */}
              <div
                onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  marginBottom: transcriptExpanded ? "1rem" : "0",
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
                    {isTranscribing && (
                      <span
                        style={{
                          color: "#6c47ff",
                          fontSize: "0.75rem",
                          fontWeight: "400",
                          marginLeft: "0.75rem",
                        }}
                      >
                        Generating...
                      </span>
                    )}
                    {transcript.length > 0 && !isTranscribing && (
                      <span
                        style={{
                          color: "#aaa",
                          fontSize: "0.75rem",
                          fontWeight: "400",
                          marginLeft: "0.75rem",
                        }}
                      >
                        {transcript.length} lines
                      </span>
                    )}
                  </h2>
                  <p style={{ color: "#bbb", fontSize: "0.8rem" }}>
                    {transcriptExpanded
                      ? "Click to collapse — hover highlighted words, click to pin info card"
                      : "Click to expand — entity names highlighted, hover or click to explore"}
                  </p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#aaa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: transcriptExpanded
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Transcript content */}
              {transcriptExpanded && (
                <div>
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
                        Generating transcript in the background...
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
                        No transcript available yet.
                      </p>
                    </div>
                  )}

                  {/* Hint banner */}
                  {insights.length > 0 && transcript.length > 0 && (
                    <div
                      style={{
                        background: "#f0edff",
                        border: "1px solid #c4b5fd",
                        borderRadius: "8px",
                        padding: "0.6rem 1rem",
                        marginBottom: "1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          background: "rgba(108,71,255,0.08)",
                          borderBottom: "2px solid #6c47ff",
                          color: "#4a2fcc",
                          fontSize: "0.78rem",
                          fontWeight: "600",
                          padding: "0 3px",
                          borderRadius: "2px",
                        }}
                      >
                        highlighted words
                      </span>
                      <p
                        style={{
                          color: "#6c47ff",
                          fontSize: "0.78rem",
                          margin: 0,
                        }}
                      >
                        — hover for quick info, click to pin the card on the
                        right
                      </p>
                    </div>
                  )}

                  {/* Bookmarked moments */}
                  {markedMoments.length > 0 && (
                    <div
                      style={{
                        background: "#fffbf0",
                        border: "1px solid #fde68a",
                        borderRadius: "10px",
                        padding: "1rem 1.25rem",
                        marginBottom: "1.25rem",
                      }}
                    >
                      <p
                        style={{
                          color: "#92400e",
                          fontSize: "0.72rem",
                          fontWeight: "700",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          marginBottom: "0.75rem",
                        }}
                      >
                        Marked Moments
                      </p>
                      {markedMoments.map((m, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "0.5rem 0",
                            borderTop: i === 0 ? "none" : "1px solid #fde68a",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "0.25rem",
                            }}
                          >
                            <span
                              onClick={() => handleTimestampClick(m.time)}
                              style={{
                                background:
                                  m.type === "important"
                                    ? "#fef3c7"
                                    : "#fee2e2",
                                color:
                                  m.type === "important"
                                    ? "#92400e"
                                    : "#991b1b",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "4px",
                                fontSize: "0.72rem",
                                fontFamily: "monospace",
                                cursor: "pointer",
                              }}
                            >
                              {formatTime(m.time)}
                            </span>
                            <span
                              style={{
                                fontSize: "0.65rem",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                color: markColor(m.type),
                                letterSpacing: "0.08em",
                              }}
                            >
                              {m.type}
                            </span>
                          </div>
                          <p
                            style={{
                              color: "#555",
                              fontSize: "0.82rem",
                              margin: "0 0 0.25rem",
                            }}
                          >
                            {m.text}
                          </p>
                          {/* AI generated note */}
                          {m.aiNote && (
                            <p
                              style={{
                                color: "#6c47ff",
                                fontSize: "0.76rem",
                                fontStyle: "italic",
                                margin: "0 0 0.25rem",
                              }}
                            >
                              AI: {m.aiNote}
                            </p>
                          )}
                          {/* Edit user note */}
                          {editingMark === m.time ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "0.5rem",
                                marginTop: "0.35rem",
                              }}
                            >
                              <input
                                defaultValue={m.userNote}
                                onBlur={(e) => {
                                  setMarkedMoments(
                                    markedMoments.map((mk) =>
                                      mk.time === m.time
                                        ? { ...mk, userNote: e.target.value }
                                        : mk,
                                    ),
                                  );
                                  setEditingMark(null);
                                }}
                                autoFocus
                                style={{
                                  flex: 1,
                                  border: "1px solid #e0d9ff",
                                  borderRadius: "6px",
                                  padding: "0.35rem 0.5rem",
                                  fontSize: "0.8rem",
                                  outline: "none",
                                }}
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingMark(m.time)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#aaa",
                                fontSize: "0.72rem",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              {m.userNote
                                ? `Your note: ${m.userNote}`
                                : "+ Add your note"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Transcript lines */}
                  {transcript.map((line, index) => {
                    const mark = isMarked(line);
                    return (
                      <div
                        key={index}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "flex",
                          gap: "0.75rem",
                          alignItems: "flex-start",
                          padding: "0.7rem 0.75rem",
                          marginBottom: "2px",
                          borderRadius: "8px",
                          background: mark
                            ? mark.type === "important"
                              ? "#fffbf0"
                              : "#fff5f5"
                            : "transparent",
                          border: mark
                            ? mark.type === "important"
                              ? "1px solid #fde68a"
                              : "1px solid #fecaca"
                            : "1px solid transparent",
                          transition: "background 0.15s",
                          position: "relative",
                        }}
                        onMouseEnter={(e) => {
                          if (!mark)
                            e.currentTarget.style.background = "#fafafa";
                        }}
                        onMouseLeave={(e) => {
                          if (!mark)
                            e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {/* Timestamp */}
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

                        {/* Text with entity highlights */}
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
                          {renderHighlightedLine(line.text)}
                        </p>

                        {/* Mark button — shows picker on click */}
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMarkingLine(
                                markingLine === line.time ? null : line.time,
                              );
                            }}
                            title="Mark as important or confusing"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "0 0.25rem",
                              opacity: mark ? 1 : 0.25,
                              transition: "opacity 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.opacity = "1")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.opacity = mark
                                ? "1"
                                : "0.25")
                            }
                          >
                            {/* Bookmark icon — coloured if marked */}
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill={mark ? markColor(mark.type) : "none"}
                              stroke={mark ? markColor(mark.type) : "#6c47ff"}
                              strokeWidth="2"
                            >
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                          </button>

                          {/* Type picker dropdown */}
                          {markingLine === line.time && (
                            <div
                              style={{
                                position: "absolute",
                                right: 0,
                                top: "110%",
                                background: "#fff",
                                border: "1px solid #ebebeb",
                                borderRadius: "10px",
                                padding: "0.5rem",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                                zIndex: 50,
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.35rem",
                                minWidth: "140px",
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMark(line, "important");
                                }}
                                style={{
                                  background: "#fffbf0",
                                  border: "1px solid #fde68a",
                                  borderRadius: "6px",
                                  padding: "0.4rem 0.75rem",
                                  color: "#92400e",
                                  fontSize: "0.78rem",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                ⭐ Important
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMark(line, "confusing");
                                }}
                                style={{
                                  background: "#fff5f5",
                                  border: "1px solid #fecaca",
                                  borderRadius: "6px",
                                  padding: "0.4rem 0.75rem",
                                  color: "#991b1b",
                                  fontSize: "0.78rem",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                ❓ Confusing
                              </button>
                              {mark && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMarkedMoments(
                                      markedMoments.filter(
                                        (m) => m.time !== line.time,
                                      ),
                                    );
                                    setMarkingLine(null);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "1px solid #ebebeb",
                                    borderRadius: "6px",
                                    padding: "0.4rem 0.75rem",
                                    color: "#aaa",
                                    fontSize: "0.78rem",
                                    cursor: "pointer",
                                    textAlign: "left",
                                  }}
                                >
                                  Remove mark
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── PINNED ENTITY SIDE CARD ── */}
            {pinnedInsight && (
              <div
                style={{
                  width: "260px",
                  flexShrink: 0,
                  background: "#fff",
                  border: "1px solid #c4b5fd",
                  borderRadius: "16px",
                  padding: "1.25rem",
                  boxShadow: "0 4px 24px rgba(108,71,255,0.12)",
                  position: "sticky",
                  top: "90px",
                  alignSelf: "flex-start",
                }}
              >
                {/* Close button */}
                <button
                  onClick={() => setPinnedInsight(null)}
                  style={{
                    position: "absolute",
                    top: "0.75rem",
                    right: "0.75rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#bbb",
                    fontSize: "1rem",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>

                {/* Type badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      background: "#6c47ff",
                      color: "#fff",
                      fontSize: "0.62rem",
                      fontWeight: "700",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "0.2rem 0.55rem",
                      borderRadius: "20px",
                    }}
                  >
                    {pinnedInsight.type}
                  </span>
                  <span style={{ color: "#bbb", fontSize: "0.7rem" }}>
                    @ {formatTime(pinnedInsight.timestamp)}
                  </span>
                </div>

                <p
                  style={{
                    fontWeight: "700",
                    color: "#1a1a2e",
                    fontSize: "0.95rem",
                    marginBottom: "0.4rem",
                  }}
                >
                  {pinnedInsight.name}
                </p>
                <p
                  style={{
                    color: "#555",
                    fontSize: "0.82rem",
                    lineHeight: 1.5,
                    marginBottom: "0.5rem",
                  }}
                >
                  {pinnedInsight.description}
                </p>
                <p
                  style={{
                    color: "#999",
                    fontSize: "0.76rem",
                    fontStyle: "italic",
                    marginBottom: "0.75rem",
                  }}
                >
                  {pinnedInsight.relevance}
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  <a
                    href={pinnedInsight.links?.wikipedia}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: "0.45rem 0.75rem",
                      background: "#f8f7ff",
                      borderRadius: "8px",
                      color: "#6c47ff",
                      fontSize: "0.78rem",
                      fontWeight: "600",
                      textDecoration: "none",
                      border: "1px solid #e0d9ff",
                    }}
                  >
                    Open Wikipedia →
                  </a>

                  {(pinnedInsight.type === "film" ||
                    pinnedInsight.type === "show") && (
                    <a
                      href={pinnedInsight.links?.imdb}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "0.45rem 0.75rem",
                        background: "#fafafa",
                        borderRadius: "8px",
                        color: "#888",
                        fontSize: "0.78rem",
                        textDecoration: "none",
                        border: "1px solid #ebebeb",
                      }}
                    >
                      Search IMDb →
                    </a>
                  )}
                  {pinnedInsight.type === "book" && (
                    <a
                      href={pinnedInsight.links?.amazon}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "0.45rem 0.75rem",
                        background: "#fafafa",
                        borderRadius: "8px",
                        color: "#888",
                        fontSize: "0.78rem",
                        textDecoration: "none",
                        border: "1px solid #ebebeb",
                      }}
                    >
                      Find on Amazon →
                    </a>
                  )}
                  <button
                    onClick={() =>
                      handleTimestampClick(pinnedInsight.timestamp)
                    }
                    style={{
                      padding: "0.45rem 0.75rem",
                      background: "none",
                      border: "1px solid #ebebeb",
                      borderRadius: "8px",
                      color: "#aaa",
                      fontSize: "0.76rem",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    Jump to {formatTime(pinnedInsight.timestamp)} in audio
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ SUMMARY & INSIGHTS PANEL ══ */}
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
            {/* ── SUMMARY SECTION ── */}
            <div style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
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
                    Summary & Takeaways
                  </h2>
                  <p style={{ color: "#bbb", fontSize: "0.8rem" }}>
                    AI summary built from the transcript and your marked moments
                  </p>
                </div>
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary || transcript.length === 0}
                  style={{
                    background: isGeneratingSummary ? "#f0edff" : "#6c47ff",
                    color: isGeneratingSummary ? "#6c47ff" : "#fff",
                    border: "none",
                    padding: "0.5rem 1.1rem",
                    borderRadius: "8px",
                    cursor: isGeneratingSummary ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    flexShrink: 0,
                  }}
                >
                  {isGeneratingSummary
                    ? "Generating..."
                    : summary
                      ? "Regenerate"
                      : "Generate Summary"}
                </button>
              </div>

              {!summary && !isGeneratingSummary && (
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
                    {transcript.length === 0
                      ? "Waiting for transcript to generate..."
                      : "Click Generate Summary to create a personalised summary. Mark moments as Important or Confusing in the transcript first to make it more relevant to you."}
                  </p>
                </div>
              )}

              {isGeneratingSummary && (
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
                    Building your summary with Claude AI...
                  </p>
                </div>
              )}

              {summary && (
                <div
                  style={{
                    background: "#f8f7ff",
                    border: "1px solid #e0d9ff",
                    borderRadius: "12px",
                    padding: "1.25rem",
                  }}
                >
                  <p
                    style={{
                      color: "#1a1a2e",
                      fontSize: "0.92rem",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {summary}
                  </p>
                  {markedMoments.length > 0 && (
                    <div
                      style={{
                        marginTop: "1rem",
                        paddingTop: "1rem",
                        borderTop: "1px solid #e0d9ff",
                      }}
                    >
                      <p
                        style={{
                          color: "#6c47ff",
                          fontSize: "0.72rem",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Based on your {markedMoments.length} marked moment
                        {markedMoments.length > 1 ? "s" : ""}
                      </p>
                      {markedMoments.map((m, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                            marginBottom: "0.3rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              color: markColor(m.type),
                              letterSpacing: "0.08em",
                              flexShrink: 0,
                            }}
                          >
                            {m.type}
                          </span>
                          <span
                            onClick={() => handleTimestampClick(m.time)}
                            style={{
                              color: "#6c47ff",
                              fontSize: "0.7rem",
                              fontFamily: "monospace",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          >
                            {formatTime(m.time)}
                          </span>
                          <span style={{ color: "#888", fontSize: "0.78rem" }}>
                            {m.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <hr
              style={{
                border: "none",
                borderTop: "1px solid #f0f0f0",
                marginBottom: "1.5rem",
              }}
            />

            {/* ── KEY INSIGHTS SECTION ── */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: "700",
                      color: "#1a1a2e",
                      marginBottom: "0.15rem",
                    }}
                  >
                    Key Insights
                  </h3>
                  <p style={{ color: "#bbb", fontSize: "0.8rem" }}>
                    Entities detected in this episode
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
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
                      padding: "0.4rem 0.9rem",
                      borderRadius: "8px",
                      cursor: isGeneratingInsights ? "not-allowed" : "pointer",
                      fontSize: "0.78rem",
                      fontWeight: "600",
                    }}
                  >
                    {isGeneratingInsights ? "Generating..." : "Regenerate"}
                  </button>
                </div>
              </div>

              {insights.length === 0 && !isGeneratingInsights && (
                <div
                  style={{
                    padding: "1.5rem",
                    textAlign: "center",
                    color: "#bbb",
                    background: "#fafafa",
                    borderRadius: "10px",
                  }}
                >
                  <p style={{ fontSize: "0.9rem" }}>
                    Insights appear automatically once transcript is ready.
                  </p>
                </div>
              )}

              {insights.map((insight, index) => (
                <div
                  key={index}
                  onClick={() => handleTimestampClick(insight.timestamp)}
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "flex-start",
                    padding: "1rem 1.25rem",
                    marginBottom: "0.5rem",
                    background: "#fafafa",
                    border: "1px solid #f0f0f0",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8f7ff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#fafafa")
                  }
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
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        color: "#1a1a2e",
                        fontSize: "0.92rem",
                        fontWeight: "600",
                        marginBottom: "0.2rem",
                      }}
                    >
                      {insight.name}
                      <span
                        style={{
                          color: "#aaa",
                          fontSize: "0.75rem",
                          fontWeight: "400",
                          marginLeft: "0.5rem",
                        }}
                      >
                        {insight.type} · {formatTime(insight.timestamp)}
                      </span>
                    </p>
                    <p
                      style={{
                        color: "#888",
                        fontSize: "0.82rem",
                        margin: 0,
                        lineHeight: 1.4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {insight.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ NOTES PANEL ══ */}
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
                Notes for this episode — saved with timestamp and synced to your
                Notes Library
              </p>
            </div>

            {/* Note input */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{
                    background: "#f0edff",
                    color: "#6c47ff",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontFamily: "monospace",
                  }}
                >
                  Writing at {formatTime(currentTime)}
                </span>
                <span style={{ color: "#bbb", fontSize: "0.72rem" }}>
                  — this timestamp will be saved with your note
                </span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type your notes here..."
                rows={5}
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
                  marginBottom: "0.75rem",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center",
                }}
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
                  Save Note
                </button>
                <button
                  onClick={() => setNotes("")}
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
            </div>

            {/* Saved notes for this episode */}
            {savedNotes.length > 0 && (
              <div>
                <p
                  style={{
                    color: "#aaa",
                    fontSize: "0.72rem",
                    fontWeight: "700",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: "0.75rem",
                  }}
                >
                  Saved Notes for This Episode
                </p>

                {savedNotes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      background: "#f8f7ff",
                      border: "1px solid #e0d9ff",
                      borderRadius: "10px",
                      padding: "1rem 1.1rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.4rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        {/* Jump to the timestamp this note was written at */}
                        <span
                          onClick={() => handleTimestampClick(note.timestamp)}
                          style={{
                            background: "#ede9ff",
                            color: "#6c47ff",
                            padding: "0.12rem 0.45rem",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontFamily: "monospace",
                            cursor: "pointer",
                          }}
                        >
                          {formatTime(note.timestamp)}
                        </span>
                        <span style={{ color: "#bbb", fontSize: "0.7rem" }}>
                          {note.writtenAt}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
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
                    <p
                      style={{
                        color: "#555",
                        fontSize: "0.88rem",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      {note.text}
                    </p>
                  </div>
                ))}

                <button
                  onClick={() => navigate("/notes")}
                  style={{
                    background: "none",
                    border: "1px solid #e0d9ff",
                    color: "#6c47ff",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    marginTop: "0.5rem",
                  }}
                >
                  View Full Notes Library →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SUGGESTED PODCASTS ── */}
      {showSuggested && !suggestedHidden && (
        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            padding: "0 2rem 3rem",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "1.5rem",
              border: "1px solid #ebebeb",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: "700",
                    color: "#1a1a2e",
                    marginBottom: "0.15rem",
                  }}
                >
                  You might also enjoy
                </h3>
                <p style={{ color: "#bbb", fontSize: "0.8rem" }}>
                  Similar podcasts to what you just listened to
                </p>
              </div>
              <button
                onClick={() => setSuggestedHidden(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#bbb",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  padding: 0,
                }}
              >
                Hide
              </button>
            </div>

            {suggested.length === 0 ? (
              <p
                style={{
                  color: "#bbb",
                  fontSize: "0.85rem",
                  textAlign: "center",
                  padding: "1rem",
                }}
              >
                Loading suggestions...
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {suggested.map((pod) => (
                  <div
                    key={pod.uuid}
                    onClick={() =>
                      pod.rssUrl &&
                      navigate(`/rss?url=${encodeURIComponent(pod.rssUrl)}`)
                    }
                    style={{
                      background: "#fafafa",
                      border: "1px solid #f0f0f0",
                      borderRadius: "10px",
                      padding: "0.75rem",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f8f7ff")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#fafafa")
                    }
                  >
                    {pod.imageUrl && (
                      <img
                        src={pod.imageUrl}
                        alt={pod.name}
                        style={{
                          width: "100%",
                          aspectRatio: "1",
                          objectFit: "cover",
                          borderRadius: "8px",
                          marginBottom: "0.5rem",
                        }}
                      />
                    )}
                    <p
                      style={{
                        color: "#1a1a2e",
                        fontSize: "0.82rem",
                        fontWeight: "600",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {pod.name}
                    </p>
                    <p
                      style={{
                        color: "#aaa",
                        fontSize: "0.72rem",
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {pod.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* ── HOVER TOOLTIP (shows on hover, click pins to side instead) ── */}
      {hoveredInsight && !pinnedInsight && (
        <div
          style={{
            position: "absolute",
            top: tooltipPos.y,
            left: Math.min(tooltipPos.x, window.innerWidth - 300),
            width: "280px",
            background: "#fff",
            border: "1px solid #c4b5fd",
            borderRadius: "12px",
            padding: "0.9rem",
            boxShadow: "0 8px 32px rgba(108,71,255,0.18)",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.4rem",
            }}
          >
            <span
              style={{
                background: "#6c47ff",
                color: "#fff",
                fontSize: "0.6rem",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "0.18rem 0.5rem",
                borderRadius: "20px",
              }}
            >
              {hoveredInsight.type}
            </span>
            <span style={{ color: "#bbb", fontSize: "0.68rem" }}>
              @ {formatTime(hoveredInsight.timestamp)}
            </span>
          </div>
          <p
            style={{
              fontWeight: "700",
              color: "#1a1a2e",
              fontSize: "0.88rem",
              marginBottom: "0.3rem",
            }}
          >
            {hoveredInsight.name}
          </p>
          <p
            style={{
              color: "#555",
              fontSize: "0.78rem",
              lineHeight: 1.5,
              marginBottom: "0.3rem",
            }}
          >
            {hoveredInsight.description}
          </p>
          <p style={{ color: "#bbb", fontSize: "0.68rem", margin: 0 }}>
            Click to pin full card →
          </p>
        </div>
      )}
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
