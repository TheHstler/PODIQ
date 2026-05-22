/* ─────────────────────────────────────────────────────────────────────────────
   src/pages/PlayerPage.jsx
   Key updates:
   - Transcript auto-scrolls to keep current line in view as audio plays
   - Active transcript line highlighted in real time
   - Bookmark icons always visible (not hidden until hover)
   - Player controls made larger and more prominent
   - Speaker label detection from transcript text
───────────────────────────────────────────────────────────────────────────── */
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import episodes from "../data/episodes";
import { colors, fonts, effects, card, btnPrimary, btnGhost, input, timeBadge, typeBadge } from "../styles/theme";

function PlayerPage({
  audioRef: sharedAudioRef,
  currentEpisode, setCurrentEpisode, loadEpisode,
  isPlaying: sharedIsPlaying, setIsPlaying: sharedSetIsPlaying,
  currentTime: sharedCurrentTime, handlePlayPause: sharedHandlePlayPause,
  handleSeek, duration: sharedDuration,
  isDark, toggleTheme,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const localAudioRef = useRef(null);
  const audioRef = sharedAudioRef || localAudioRef;

  /* Ref to the transcript scroll container — used for auto-scroll */
  const transcriptScrollRef = useRef(null);
  /* Refs for each transcript line so we can scroll to the active one */
  const lineRefs = useRef({});

  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const isPlaying = sharedIsPlaying !== undefined ? sharedIsPlaying : localIsPlaying;
  const currentTime = sharedCurrentTime !== undefined ? sharedCurrentTime : localCurrentTime;
  const duration = sharedDuration !== undefined ? sharedDuration : localDuration;

  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState([]);
  const [noteSaved, setNoteSaved] = useState(false);
  const [markedMoments, setMarkedMoments] = useState([]);
  const [markingLine, setMarkingLine] = useState(null);
  const [editingMark, setEditingMark] = useState(null);
  const [activeTab, setActiveTab] = useState("transcript");
  const [transcriptExpanded, setTranscriptExpanded] = useState(true);
  const [transcript, setTranscript] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [isGeneratingChapters, setIsGeneratingChapters] = useState(false);
  const [insights, setInsights] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState("");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [summary, setSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [hoveredInsight, setHoveredInsight] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [pinnedInsight, setPinnedInsight] = useState(null);
  const [wordSearch, setWordSearch] = useState("");
  const [wordDefinition, setWordDefinition] = useState(null);
  const [isSearchingWord, setIsSearchingWord] = useState(false);
  const [wordSearchError, setWordSearchError] = useState("");
  const [suggested, setSuggested] = useState([]);
  const [showSuggested, setShowSuggested] = useState(false);
  const [suggestedHidden, setSuggestedHidden] = useState(false);

  const episode = location.state?.episode || episodes.find((ep) => ep.id === parseInt(id));

  /* ── FIND ACTIVE TRANSCRIPT LINE based on currentTime ── */
  const activeLineIndex = (() => {
    if (!transcript.length) return -1;
    let active = 0;
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].time <= currentTime) active = i;
      else break;
    }
    return active;
  })();

  /* ── AUTO-SCROLL TRANSCRIPT to keep active line visible ── */
  useEffect(() => {
    if (!transcriptExpanded) return;
    if (activeLineIndex < 0) return;
    const lineEl = lineRefs.current[activeLineIndex];
    if (lineEl && transcriptScrollRef.current) {
      lineEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeLineIndex, transcriptExpanded]);

  /* ── DETECT SPEAKER from transcript line ──
     Lines that start with "NAME:" pattern are treated as speaker labels.
     e.g. "Jack: Welcome to the show" → speaker = "Jack"            */
  function parseSpeaker(text) {
    const match = text.match(/^([A-Z][a-zA-Z\s]{1,20}):\s+(.+)/);
    if (match) return { speaker: match[1].trim(), text: match[2].trim() };
    return { speaker: null, text };
  }

  /* Build a colour for each unique speaker name */
  const speakerColors = {};
  const speakerPalette = [colors.purple, colors.blue, colors.teal, "#F472B6", "#F59E0B"];
  let speakerCount = 0;
  transcript.forEach((line) => {
    const { speaker } = parseSpeaker(line.text);
    if (speaker && !speakerColors[speaker]) {
      speakerColors[speaker] = speakerPalette[speakerCount % speakerPalette.length];
      speakerCount++;
    }
  });

  /* ── LOAD EPISODE INTO SHARED AUDIO ── */
  useEffect(() => {
    if (!episode) return;
    if (sharedAudioRef && loadEpisode && currentEpisode?.guid !== episode.guid) {
      loadEpisode(episode);
    } else if (!sharedAudioRef && audioRef.current) {
      audioRef.current.src = episode.audioSrc;
    }
  }, [episode?.guid]);

  useEffect(() => {
    if (autoLoaded) return;
    if (!episode?.audioSrc) return;
    setAutoLoaded(true);
    setTimeout(() => { handleTranscribe(); }, 1200);
  }, [episode]);

  /* Local audio events (fallback when no shared audio) */
  useEffect(() => {
    if (sharedAudioRef) return;
    const audio = audioRef.current;
    if (!audio) return;
    function onTimeUpdate() { setLocalCurrentTime(audio.currentTime); }
    function onDurationChange() { setLocalDuration(audio.duration || 0); }
    function onEnded() { setLocalIsPlaying(false); setShowSuggested(true); fetchSuggestedPodcasts(); }
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, [sharedAudioRef]);

  useEffect(() => {
    if (!episode) return;
    const key = `notes_${episode.guid || episode.id}`;
    const stored = localStorage.getItem(key);
    if (stored) setSavedNotes(JSON.parse(stored));
  }, [episode]);

  if (!episode) {
    return (
      <div style={{ padding: "2rem", color: "#fff", background: colors.bg, minHeight: "100vh", fontFamily: fonts.body }}>
        Episode not found. <span onClick={() => navigate("/")} style={{ color: colors.purple, cursor: "pointer" }}>Go home</span>
      </div>
    );
  }

  /* ── AUDIO CONTROLS ── */
  function handlePlayPause() {
    if (sharedHandlePlayPause) { sharedHandlePlayPause(); return; }
    const audio = audioRef.current;
    if (localIsPlaying) { audio.pause(); setLocalIsPlaying(false); }
    else { audio.play().then(() => setLocalIsPlaying(true)).catch(() => {}); }
  }
  function handleRewind() { audioRef.current.currentTime -= 10; }
  function handleFastForward() { audioRef.current.currentTime += 10; }
  function handleTimestampClick(time) {
    if (handleSeek) handleSeek(time); else audioRef.current.currentTime = time;
    audioRef.current.play();
    if (sharedSetIsPlaying) sharedSetIsPlaying(true); else setLocalIsPlaying(true);
  }
  function handleProgressClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const newTime = ((e.clientX - rect.left) / rect.width) * duration;
    if (handleSeek) handleSeek(newTime); else { audioRef.current.currentTime = newTime; setLocalCurrentTime(newTime); }
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
  }

  /* ── BOOKMARK ── */
  async function handleMark(line, type) {
    const existing = markedMoments.find((m) => m.time === line.time);
    if (existing) {
      if (existing.type === type) setMarkedMoments(markedMoments.filter((m) => m.time !== line.time));
      else setMarkedMoments(markedMoments.map((m) => m.time === line.time ? { ...m, type } : m));
      setMarkingLine(null); return;
    }
    const aiNote = await generateBookmarkNote(line, type);
    setMarkedMoments([...markedMoments, { time: line.time, text: line.text, type, aiNote, userNote: "" }]);
    setMarkingLine(null);
  }

  async function generateBookmarkNote(line, type) {
    try {
      const res = await fetch("http://localhost:3001/api/bookmark-note", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: line.text, time: line.time, type, episodeTitle: episode.title }),
      });
      return (await res.json()).note || "";
    } catch { return ""; }
  }

  function isMarked(line) { return markedMoments.find((m) => m.time === line.time) || null; }
  function markColor(type) {
    if (type === "important") return colors.amber;
    if (type === "confusing") return colors.red;
    return colors.purple;
  }

  /* ── NOTES ── */
  function handleSaveNotes() {
    if (!notes.trim()) return;
    const key = `notes_${episode.guid || episode.id}`;
    const newNote = { id: Date.now(), text: notes, timestamp: currentTime, writtenAt: new Date().toLocaleString("en-GB"), episodeTitle: episode.title, episodeGuid: episode.guid || episode.id, podcastImage: episode.image };
    const updated = [...savedNotes, newNote];
    setSavedNotes(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    const library = JSON.parse(localStorage.getItem("notes_library") || "[]");
    library.push(newNote); localStorage.setItem("notes_library", JSON.stringify(library));
    setNotes(""); setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  function handleDeleteNote(noteId) {
    const key = `notes_${episode.guid || episode.id}`;
    const updated = savedNotes.filter((n) => n.id !== noteId);
    setSavedNotes(updated); localStorage.setItem(key, JSON.stringify(updated));
    const library = JSON.parse(localStorage.getItem("notes_library") || "[]");
    localStorage.setItem("notes_library", JSON.stringify(library.filter((n) => n.id !== noteId)));
  }

  /* ── WORD SEARCH ── */
  async function handleWordSearch(e) {
    e.preventDefault();
    if (!wordSearch.trim()) return;
    setIsSearchingWord(true); setWordDefinition(null); setWordSearchError("");
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(wordSearch.trim())}`);
      if (!res.ok) throw new Error("Word not found");
      const data = await res.json();
      const entry = data[0]; const meaning = entry.meanings[0];
      setWordDefinition({ word: entry.word, phonetic: entry.phonetic || "", partOfSpeech: meaning?.partOfSpeech || "", definition: meaning?.definitions[0]?.definition || "No definition found.", example: meaning?.definitions[0]?.example || "" });
    } catch { setWordSearchError("Could not find a definition for that word."); }
    finally { setIsSearchingWord(false); }
  }

  /* ── ENTITY HIGHLIGHTS ── */
  function renderHighlightedLine(text) {
    if (!insights || insights.length === 0) return text;
    const sorted = [...insights].sort((a, b) => b.name.length - a.name.length);
    let remaining = text; const parts = []; let keyCounter = 0;
    while (remaining.length > 0) {
      let earliestIndex = -1; let matchedInsight = null; let matchedName = "";
      for (const insight of sorted) {
        const idx = remaining.toLowerCase().indexOf(insight.name.toLowerCase());
        if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) { earliestIndex = idx; matchedInsight = insight; matchedName = remaining.slice(idx, idx + insight.name.length); }
      }
      if (matchedInsight === null) { parts.push(<span key={keyCounter++}>{remaining}</span>); break; }
      if (earliestIndex > 0) parts.push(<span key={keyCounter++}>{remaining.slice(0, earliestIndex)}</span>);
      const insight = matchedInsight;
      parts.push(
        <span key={keyCounter++}
          onMouseEnter={(e) => { setHoveredInsight(insight); const rect = e.currentTarget.getBoundingClientRect(); setTooltipPos({ x: rect.left, y: rect.bottom + window.scrollY + 6 }); }}
          onMouseLeave={() => setHoveredInsight(null)}
          onClick={(e) => { e.stopPropagation(); setPinnedInsight((prev) => prev?.name === insight.name ? null : insight); }}
          style={{ background: "rgba(139,92,246,0.18)", borderRadius: "3px", padding: "1px 3px", cursor: "pointer", borderBottom: `2px solid ${colors.purple}`, color: colors.purpleLight, fontWeight: "600" }}
        >{matchedName}</span>
      );
      remaining = remaining.slice(earliestIndex + matchedName.length);
    }
    return parts;
  }

  /* ── TRANSCRIBE ── */
  async function handleTranscribe() {
    setIsTranscribing(true); setTranscribeError("");
    try {
      const response = await fetch("http://localhost:3001/api/transcribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: episode.audioSrc, title: episode.title }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTranscript(data.transcript);
      setIsGeneratingInsights(true);
      setIsGeneratingChapters(true);
      const [insightsRes, chaptersRes] = await Promise.all([
        fetch("http://localhost:3001/api/insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: data.fullText, lines: data.transcript }) }),
        fetch("http://localhost:3001/api/chapters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: data.fullText, lines: data.transcript }) }),
      ]);
      const insightsData = await insightsRes.json();
      if (insightsRes.ok && insightsData.insights) setInsights(insightsData.insights);
      const chaptersData = await chaptersRes.json();
      if (chaptersRes.ok && chaptersData.chapters) setChapters(chaptersData.chapters);
    } catch (err) { setTranscribeError("Could not generate transcript: " + err.message); }
    finally { setIsTranscribing(false); setIsGeneratingInsights(false); setIsGeneratingChapters(false); }
  }

  async function handleGenerateSummary() {
    setIsGeneratingSummary(true);
    try {
      const markedText = markedMoments.map((m) => `[${formatTime(m.time)}] (${m.type}) ${m.text}`).join("\n");
      const res = await fetch("http://localhost:3001/api/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: transcript.map((l) => l.text).join(" "), markedMoments: markedText, episodeTitle: episode.title }) });
      const data = await res.json();
      if (data.summary) setSummary(data.summary);
    } catch (err) { console.error(err); }
    finally { setIsGeneratingSummary(false); }
  }

  async function handleGenerateInsights() {
    setIsGeneratingInsights(true);
    try {
      const textToAnalyse = transcript.length > 0 ? transcript.map((l) => l.text).join(" ") : episode.description;
      const res = await fetch("http://localhost:3001/api/insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: textToAnalyse, lines: transcript }) });
      const data = await res.json();
      if (data.insights) setInsights(data.insights);
    } catch (err) { console.error(err); }
    finally { setIsGeneratingInsights(false); }
  }

  async function fetchSuggestedPodcasts() {
    try {
      const res = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(episode.title)}`);
      const data = await res.json();
      if (data.podcasts) setSuggested(data.podcasts.slice(0, 4));
    } catch { }
  }

  /* ── BUILD CHAPTERED TRANSCRIPT ── */
  function buildChapteredTranscript() {
    if (!chapters.length) return [{ chapter: null, lines: transcript }];
    const groups = [];
    let currentChapter = null;
    let currentLines = [];
    for (const line of transcript) {
      const newChapter = chapters.find((c) => line.time >= c.timestamp && (!currentChapter || c.timestamp > currentChapter.timestamp));
      if (newChapter && newChapter !== currentChapter) {
        if (currentLines.length > 0) groups.push({ chapter: currentChapter, lines: currentLines });
        currentChapter = newChapter;
        currentLines = [line];
      } else {
        currentLines.push(line);
      }
    }
    if (currentLines.length > 0) groups.push({ chapter: currentChapter, lines: currentLines });
    return groups;
  }

  const chapteredTranscript = buildChapteredTranscript();

  /* ── THEME ── */
  const dark = isDark !== false;
  const c = dark ? {
    bg: colors.bg, card: colors.bgCard, cardHover: colors.bgCardHover,
    text: colors.textPrimary, textSub: colors.textSecondary, textMuted: colors.textMuted,
    border: colors.border, borderAccent: colors.borderAccent,
    navBg: "rgba(15,15,18,0.92)", inputBg: colors.bgInput,
    activeLine: "rgba(139,92,246,0.12)",
  } : {
    bg: "#f8f7f4", card: "#ffffff", cardHover: "#f8f7ff",
    text: "#1a1a2e", textSub: "#555", textMuted: "#999",
    border: "#ebebeb", borderAccent: "rgba(108,71,255,0.3)",
    navBg: "rgba(255,255,255,0.95)", inputBg: "#fafafa",
    activeLine: "#f0edff",
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: fonts.body, paddingBottom: "6rem" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bookmarkPop { 0%{transform:scale(1)} 40%{transform:scale(1.5)} 100%{transform:scale(1)} }
        @keyframes activeLinePulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
        * { box-sizing:border-box; }
        ::placeholder { color: #6B6B7A; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#444;border-radius:4px}
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
          {toggleTheme && (
            <button onClick={toggleTheme} style={{ background: dark ? colors.purpleDim : "#f0edff", border: `1px solid ${c.borderAccent}`, borderRadius: "20px", padding: "0.4rem 0.85rem", cursor: "pointer", fontSize: "0.82rem", color: colors.purple, fontWeight: "600", fontFamily: fonts.body }}>
              {dark ? "☀️" : "🌙"}
            </button>
          )}
          <button onClick={() => navigate(-1)} style={{ background: c.card, border: `1px solid ${c.border}`, color: c.textMuted, padding: "0.45rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem", fontFamily: fonts.body }}>← Back</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ position: "relative", width: "100%", height: "340px", overflow: "hidden" }}>
        <img src={episode.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(50px) brightness(0.25) saturate(0.6)", transform: "scale(1.12)" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(15,15,18,0.5)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.2) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "200px", background: `linear-gradient(to bottom, transparent, ${c.bg})` }} />

        <div style={{ position: "absolute", bottom: "2.5rem", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "900px", padding: "0 2rem", display: "flex", gap: "2rem", alignItems: "flex-end" }}>
          {episode.image && (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <img src={episode.image} alt={episode.title} style={{ width: "120px", height: "120px", borderRadius: "16px", objectFit: "cover", boxShadow: "0 8px 40px rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.1)", display: "block" }} />
              <div style={{ position: "absolute", bottom: "-12px", left: "50%", transform: "translateX(-50%)", width: "90px", height: "20px", background: "rgba(139,92,246,0.5)", filter: "blur(14px)", borderRadius: "50%" }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: colors.purple, fontSize: "0.65rem", fontWeight: "700", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Now Playing</p>
            <h1 style={{ fontFamily: fonts.heading, fontSize: "clamp(1.3rem, 3.5vw, 2.2rem)", fontWeight: "800", color: "#fff", marginBottom: "0.6rem", textShadow: "0 2px 20px rgba(0,0,0,0.8)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {episode.title}
            </h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.4)", color: colors.purpleLight, fontSize: "0.65rem", fontWeight: "700", padding: "0.2rem 0.65rem", borderRadius: "20px" }}>✦ AI Transcribed</span>
              {transcript.length > 0 && <span style={{ background: "rgba(110,231,183,0.15)", border: "1px solid rgba(110,231,183,0.3)", color: colors.teal, fontSize: "0.65rem", fontWeight: "600", padding: "0.2rem 0.65rem", borderRadius: "20px" }}>{transcript.length} lines</span>}
              {chapters.length > 0 && <span style={{ background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)", color: colors.blue, fontSize: "0.65rem", fontWeight: "600", padding: "0.2rem 0.65rem", borderRadius: "20px" }}>{chapters.length} chapters</span>}
            </div>
          </div>
        </div>
      </div>

      {!sharedAudioRef && <audio ref={localAudioRef} src={episode.audioSrc} />}

      {/* ── PLAYER CONTROLS — bigger and more prominent ── */}
      <div style={{ maxWidth: "620px", margin: "-0.5rem auto 2rem", padding: "0 2rem" }}>
        <div style={{
          background: dark ? colors.bgCard : "#fff",
          borderRadius: "24px",
          padding: "1.75rem 2.5rem",
          boxShadow: dark ? `0 8px 48px rgba(0,0,0,0.4), ${effects.glowPurple}` : "0 8px 40px rgba(108,71,255,0.12)",
          border: `1px solid ${c.border}`,
        }}>
          {/* Progress bar — taller and easier to click */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div
              onClick={handleProgressClick}
              style={{ width: "100%", height: "6px", background: dark ? "rgba(255,255,255,0.1)" : "#ebebeb", borderRadius: "3px", cursor: "pointer", position: "relative", marginBottom: "0.6rem" }}
            >
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${duration ? (currentTime / duration) * 100 : 0}%`, background: `linear-gradient(90deg, ${colors.purple}, ${colors.purpleLight})`, borderRadius: "3px", transition: "width 0.1s linear" }} />
              <div style={{ position: "absolute", top: "50%", left: `${duration ? (currentTime / duration) * 100 : 0}%`, transform: "translate(-50%,-50%)", width: "18px", height: "18px", borderRadius: "50%", background: colors.purpleLight, boxShadow: `0 0 0 3px ${c.bg}, 0 0 12px ${colors.purple}` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: c.textMuted, fontSize: "0.78rem", fontFamily: fonts.mono, fontWeight: "600" }}>{formatTime(currentTime)}</span>
              <span style={{ color: c.textMuted, fontSize: "0.78rem", fontFamily: fonts.mono }}>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback buttons — larger */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2rem" }}>
            {/* Rewind */}
            <button onClick={handleRewind} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", padding: "0.5rem", borderRadius: "12px", transition: "background 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "#f0f0f0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.textSub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.51" />
              </svg>
              <span style={{ fontSize: "0.65rem", color: c.textMuted, marginTop: "3px", fontFamily: fonts.body }}>10s</span>
            </button>

            {/* Play/Pause — big */}
            <button
              onClick={handlePlayPause}
              style={{
                width: "76px", height: "76px", borderRadius: "50%",
                background: `linear-gradient(135deg, ${colors.purple}, ${colors.purpleLight})`,
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 8px 32px rgba(139,92,246,0.5)`,
                transition: "transform 0.15s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(139,92,246,0.6)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(139,92,246,0.5)"; }}
            >
              {isPlaying ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><polygon points="6,3 20,12 6,21" /></svg>
              )}
            </button>

            {/* Fast forward */}
            <button onClick={handleFastForward} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", padding: "0.5rem", borderRadius: "12px", transition: "background 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "#f0f0f0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.textSub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-.49-3.51" />
              </svg>
              <span style={{ fontSize: "0.65rem", color: c.textMuted, marginTop: "3px", fontFamily: fonts.body }}>10s</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── GENERATING INDICATOR ── */}
      {(isTranscribing || isGeneratingInsights || isGeneratingChapters) && (
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 2rem 1rem" }}>
          <div style={{ background: dark ? colors.purpleDim : "#f0edff", border: `1px solid ${c.borderAccent}`, borderRadius: "10px", padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.purple, animation: "pulse 1.2s infinite" }} />
            <p style={{ color: colors.purple, fontSize: "0.85rem", margin: 0 }}>
              {isTranscribing ? "Generating transcript — 1-2 minutes..." : isGeneratingChapters ? "Generating AI chapters..." : "Extracting insights..."}
            </p>
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 2rem 1rem" }}>
        <div style={{ display: "flex", gap: "2px", background: dark ? colors.bgCard : "#ebebeb", border: `1px solid ${c.border}`, borderRadius: "12px", padding: "3px", width: "fit-content" }}>
          {[{ key: "transcript", label: "Transcript" }, { key: "insights", label: "Summary & Insights" }, { key: "notes", label: "My Notes" }].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              background: activeTab === tab.key ? (dark ? colors.purpleDim : "#fff") : "transparent",
              color: activeTab === tab.key ? (dark ? colors.purpleLight : "#1a1a2e") : c.textMuted,
              border: activeTab === tab.key ? `1px solid ${c.borderAccent}` : "1px solid transparent",
              padding: "0.5rem 1.25rem", borderRadius: "9px", cursor: "pointer",
              fontSize: "0.85rem", fontWeight: activeTab === tab.key ? "600" : "400",
              transition: "all 0.15s", fontFamily: fonts.body,
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* ── PANELS ── */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 2rem 4rem" }}>

        {/* ══ TRANSCRIPT PANEL ══ */}
        {activeTab === "transcript" && (
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>

            <div style={{ flex: 1, background: c.card, borderRadius: "16px", padding: "1.75rem", border: `1px solid ${c.border}`, boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.04)", minWidth: 0 }}>

              {/* Word search */}
              <div style={{ marginBottom: "1.25rem" }}>
                <p style={{ color: c.textMuted, fontSize: "0.68rem", fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Word Search</p>
                <form onSubmit={handleWordSearch} style={{ display: "flex", gap: "0.5rem" }}>
                  <input value={wordSearch} onChange={(e) => setWordSearch(e.target.value)} placeholder="Type a word to define..." style={{ flex: 1, background: dark ? colors.bgInput : "#fafafa", border: `1px solid ${c.border}`, borderRadius: "8px", color: c.text, fontSize: "0.88rem", fontFamily: fonts.body, outline: "none", padding: "0.65rem 0.9rem" }} />
                  <button type="submit" style={{ ...btnPrimary, padding: "0.65rem 1.1rem" }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
                    {isSearchingWord ? "..." : "Define"}
                  </button>
                </form>
                {wordDefinition && (
                  <div style={{ marginTop: "0.75rem", background: dark ? colors.purpleDim : "#f8f7ff", border: `1px solid ${c.borderAccent}`, borderRadius: "10px", padding: "0.9rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.3rem" }}>
                      <span style={{ fontWeight: "700", color: c.text, fontSize: "0.95rem" }}>{wordDefinition.word}</span>
                      <span style={{ color: c.textMuted, fontSize: "0.75rem" }}>{wordDefinition.phonetic}</span>
                      <span style={{ background: colors.purple, color: "#fff", fontSize: "0.62rem", fontWeight: "600", padding: "0.1rem 0.45rem", borderRadius: "20px" }}>{wordDefinition.partOfSpeech}</span>
                    </div>
                    <p style={{ color: c.textSub, fontSize: "0.85rem", lineHeight: 1.5, marginBottom: wordDefinition.example ? "0.3rem" : 0 }}>{wordDefinition.definition}</p>
                    {wordDefinition.example && <p style={{ color: c.textMuted, fontSize: "0.78rem", fontStyle: "italic" }}>"{wordDefinition.example}"</p>}
                    <button onClick={() => { setWordDefinition(null); setWordSearch(""); }} style={{ background: "none", border: "none", color: c.textMuted, fontSize: "0.72rem", cursor: "pointer", marginTop: "0.3rem", padding: 0 }}>Dismiss</button>
                  </div>
                )}
                {wordSearchError && <p style={{ color: colors.red, fontSize: "0.8rem", marginTop: "0.5rem" }}>{wordSearchError}</p>}
              </div>

              <hr style={{ border: "none", borderTop: `1px solid ${c.border}`, marginBottom: "1.25rem" }} />

              {/* Transcript header */}
              <div onClick={() => setTranscriptExpanded(!transcriptExpanded)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: transcriptExpanded ? "1rem" : "0" }}>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: "700", color: c.text, marginBottom: "0.2rem", fontFamily: fonts.heading }}>
                    Transcript
                    {isTranscribing && <span style={{ color: colors.purple, fontSize: "0.75rem", fontWeight: "400", marginLeft: "0.75rem" }}>Generating...</span>}
                    {transcript.length > 0 && !isTranscribing && <span style={{ color: c.textMuted, fontSize: "0.75rem", fontWeight: "400", marginLeft: "0.75rem" }}>{transcript.length} lines · {chapters.length} chapters</span>}
                  </h2>
                  <p style={{ color: c.textMuted, fontSize: "0.78rem" }}>
                    {transcriptExpanded ? "Auto-syncing with audio · hover highlighted words · click to pin" : "Click to expand · syncs with playback · chapters inside"}
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: transcriptExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {transcriptExpanded && (
                <div>
                  {transcribeError && <p style={{ color: colors.red, fontSize: "0.85rem", marginBottom: "1rem" }}>{transcribeError}</p>}
                  {isTranscribing && <div style={{ padding: "2rem", textAlign: "center", color: c.textMuted, background: dark ? "rgba(255,255,255,0.02)" : "#fafafa", borderRadius: "10px" }}><p>Generating transcript in the background...</p></div>}
                  {transcript.length === 0 && !isTranscribing && <div style={{ padding: "2rem", textAlign: "center", color: c.textMuted, background: dark ? "rgba(255,255,255,0.02)" : "#fafafa", borderRadius: "10px" }}><p>No transcript available yet.</p></div>}

                  {/* Hint banner */}
                  {insights.length > 0 && transcript.length > 0 && (
                    <div style={{ background: dark ? colors.purpleDim : "#f0edff", border: `1px solid ${c.borderAccent}`, borderRadius: "8px", padding: "0.55rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ background: "rgba(139,92,246,0.2)", borderBottom: `2px solid ${colors.purple}`, color: colors.purpleLight, fontSize: "0.75rem", fontWeight: "600", padding: "0 3px", borderRadius: "2px" }}>highlighted words</span>
                      <p style={{ color: colors.purple, fontSize: "0.75rem", margin: 0 }}>— hover for info · click to pin card · transcript auto-scrolls with audio</p>
                    </div>
                  )}

                  {/* Marked moments summary */}
                  {markedMoments.length > 0 && (
                    <div style={{ background: dark ? "rgba(245,158,11,0.06)" : "#fffbf0", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "10px", padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
                      <p style={{ color: colors.amber, fontSize: "0.68rem", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Marked Moments ({markedMoments.length})</p>
                      {markedMoments.map((m, i) => (
                        <div key={i} style={{ padding: "0.5rem 0", borderTop: i === 0 ? "none" : "1px solid rgba(245,158,11,0.15)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                            <span onClick={() => handleTimestampClick(m.time)} style={{ background: m.type === "important" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)", color: markColor(m.type), padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontFamily: fonts.mono, cursor: "pointer" }}>{formatTime(m.time)}</span>
                            <span style={{ fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", color: markColor(m.type), letterSpacing: "0.08em" }}>{m.type}</span>
                          </div>
                          <p style={{ color: c.textSub, fontSize: "0.82rem", margin: "0 0 0.2rem" }}>{m.text}</p>
                          {m.aiNote && <p style={{ color: colors.purple, fontSize: "0.76rem", fontStyle: "italic", margin: "0 0 0.2rem" }}>AI: {m.aiNote}</p>}
                          {editingMark === m.time ? (
                            <input defaultValue={m.userNote} onBlur={(e) => { setMarkedMoments(markedMoments.map((mk) => mk.time === m.time ? { ...mk, userNote: e.target.value } : mk)); setEditingMark(null); }} autoFocus style={{ width: "100%", background: dark ? colors.bgInput : "#fafafa", border: `1px solid ${c.border}`, borderRadius: "6px", color: c.text, fontSize: "0.8rem", fontFamily: fonts.body, outline: "none", padding: "0.35rem 0.5rem", marginTop: "0.25rem" }} />
                          ) : (
                            <button onClick={() => setEditingMark(m.time)} style={{ background: "none", border: "none", color: c.textMuted, fontSize: "0.72rem", cursor: "pointer", padding: 0 }}>{m.userNote ? `Your note: ${m.userNote}` : "+ Add your note"}</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── SCROLLABLE TRANSCRIPT CONTAINER ── */}
                  <div ref={transcriptScrollRef} style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "4px" }}>
                    {chapteredTranscript.map((group, groupIndex) => (
                      <div key={groupIndex}>

                        {/* Chapter header */}
                        {group.chapter && (
                          <div onClick={() => handleTimestampClick(group.chapter.timestamp)}
                            style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 0 0.5rem", marginTop: groupIndex > 0 ? "0.5rem" : "0", cursor: "pointer", borderTop: groupIndex > 0 ? `1px solid ${c.border}` : "none" }}>
                            <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: dark ? colors.purpleDim : "#f0edff", border: `1px solid ${c.borderAccent}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ color: colors.purple, fontSize: "0.62rem", fontWeight: "700" }}>{groupIndex + 1}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: c.text, fontSize: "0.88rem", fontWeight: "700", marginBottom: "0.1rem", fontFamily: fonts.heading }}>{group.chapter.title}</p>
                              {group.chapter.summary && <p style={{ color: c.textMuted, fontSize: "0.73rem", lineHeight: 1.4 }}>{group.chapter.summary}</p>}
                            </div>
                            <span style={{ color: colors.purple, fontSize: "0.68rem", fontFamily: fonts.mono, flexShrink: 0, background: dark ? colors.purpleDim : "#f0edff", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>{formatTime(group.chapter.timestamp)}</span>
                          </div>
                        )}

                        {/* Transcript lines */}
                        {group.lines.map((line, lineIndex) => {
                          /* Find the global index of this line for active detection */
                          const globalIndex = transcript.indexOf(line);
                          const isActive = globalIndex === activeLineIndex;
                          const mark = isMarked(line);
                          const { speaker, text: lineText } = parseSpeaker(line.text);
                          const speakerColor = speaker ? speakerColors[speaker] : null;

                          return (
                            <div
                              key={lineIndex}
                              ref={(el) => { if (globalIndex >= 0) lineRefs.current[globalIndex] = el; }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: "flex", gap: "0.75rem", alignItems: "flex-start",
                                padding: "0.75rem 0.75rem",
                                marginBottom: "2px",
                                borderRadius: "10px",
                                /* Active line gets a strong highlight */
                                background: isActive
                                  ? (dark ? "rgba(139,92,246,0.15)" : "#f0edff")
                                  : mark
                                  ? (mark.type === "important" ? "rgba(245,158,11,0.07)" : "rgba(239,68,68,0.07)")
                                  : "transparent",
                                border: isActive
                                  ? `1px solid ${c.borderAccent}`
                                  : mark
                                  ? (mark.type === "important" ? "1px solid rgba(245,158,11,0.25)" : "1px solid rgba(239,68,68,0.25)")
                                  : "1px solid transparent",
                                transition: "all 0.2s",
                                position: "relative",
                              }}
                              onMouseEnter={(e) => { if (!isActive && !mark) e.currentTarget.style.background = dark ? colors.bgCardHover : "#f8f7f0"; }}
                              onMouseLeave={(e) => { if (!isActive && !mark) e.currentTarget.style.background = "transparent"; }}
                            >
                              {/* Active line indicator bar */}
                              {isActive && (
                                <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: "3px", borderRadius: "2px", background: `linear-gradient(to bottom, ${colors.purple}, ${colors.purpleLight})`, animation: "activeLinePulse 1.5s infinite" }} />
                              )}

                              {/* Timestamp */}
                              <span
                                onClick={() => handleTimestampClick(line.time)}
                                style={{
                                  background: isActive ? colors.purple : (dark ? colors.purpleDim : "#f0edff"),
                                  color: isActive ? "#fff" : colors.purple,
                                  padding: "0.15rem 0.5rem", borderRadius: "4px",
                                  fontSize: "0.68rem", fontFamily: fonts.mono,
                                  whiteSpace: "nowrap", marginTop: "4px", flexShrink: 0, cursor: "pointer",
                                  transition: "all 0.2s",
                                  fontWeight: isActive ? "700" : "400",
                                }}
                              >
                                {formatTime(line.time)}
                              </span>

                              {/* Text block */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Speaker label — shown if detected */}
                                {speaker && (
                                  <p style={{ fontSize: "0.65rem", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: speakerColor, marginBottom: "0.2rem" }}>
                                    {speaker}
                                  </p>
                                )}
                                <p
                                  onClick={() => handleTimestampClick(line.time)}
                                  style={{
                                    color: isActive ? c.text : c.textSub,
                                    fontSize: isActive ? "0.93rem" : "0.9rem",
                                    margin: 0, lineHeight: 1.65,
                                    cursor: "pointer",
                                    fontWeight: isActive ? "500" : "400",
                                    transition: "all 0.2s",
                                  }}
                                >
                                  {renderHighlightedLine(speaker ? lineText : line.text)}
                                </p>
                              </div>

                              {/* ── BOOKMARK BUTTON — always visible, not hidden ── */}
                              <div style={{ position: "relative", flexShrink: 0 }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setMarkingLine(markingLine === line.time ? null : line.time); }}
                                  title="Mark as important or confusing"
                                  style={{
                                    background: mark
                                      ? (mark.type === "important" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)")
                                      : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
                                    border: mark
                                      ? `1.5px solid ${markColor(mark.type)}`
                                      : `1.5px solid ${c.border}`,
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    padding: "0.35rem 0.45rem",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    transition: "all 0.2s",
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.purple; e.currentTarget.style.background = dark ? "rgba(139,92,246,0.15)" : "#f0edff"; }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = mark ? markColor(mark.type) : c.border;
                                    e.currentTarget.style.background = mark ? (mark.type === "important" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)") : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)");
                                  }}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24"
                                    fill={mark ? markColor(mark.type) : "none"}
                                    stroke={mark ? markColor(mark.type) : c.textMuted}
                                    strokeWidth="2"
                                    style={{ animation: mark ? "bookmarkPop 0.3s ease" : "none" }}>
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                  </svg>
                                </button>

                                {/* Mark type picker */}
                                {markingLine === line.time && (
                                  <div style={{ position: "absolute", right: 0, top: "110%", background: dark ? colors.bgCard : "#fff", border: `1px solid ${c.border}`, borderRadius: "10px", padding: "0.5rem", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", zIndex: 50, display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: "150px" }}>
                                    <button onClick={(e) => { e.stopPropagation(); handleMark(line, "important"); }} style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "7px", padding: "0.5rem 0.75rem", color: colors.amber, fontSize: "0.8rem", fontWeight: "600", cursor: "pointer", textAlign: "left", fontFamily: fonts.body }}>⭐ Important</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleMark(line, "confusing"); }} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "7px", padding: "0.5rem 0.75rem", color: colors.red, fontSize: "0.8rem", fontWeight: "600", cursor: "pointer", textAlign: "left", fontFamily: fonts.body }}>❓ Confusing</button>
                                    {mark && <button onClick={(e) => { e.stopPropagation(); setMarkedMoments(markedMoments.filter((m) => m.time !== line.time)); setMarkingLine(null); }} style={{ background: "none", border: `1px solid ${c.border}`, borderRadius: "7px", padding: "0.5rem 0.75rem", color: c.textMuted, fontSize: "0.78rem", cursor: "pointer", textAlign: "left", fontFamily: fonts.body }}>Remove mark</button>}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── PINNED ENTITY SIDE CARD ── */}
            {pinnedInsight && (
              <div style={{ width: "260px", flexShrink: 0, background: c.card, border: `1px solid ${c.borderAccent}`, borderRadius: "16px", padding: "1.25rem", boxShadow: dark ? effects.glowPurple : "0 4px 20px rgba(108,71,255,0.12)", position: "sticky", top: "90px", alignSelf: "flex-start" }}>
                <button onClick={() => setPinnedInsight(null)} style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "none", border: "none", cursor: "pointer", color: c.textMuted, fontSize: "1rem", lineHeight: 1 }}>✕</button>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ background: colors.purple, color: "#fff", fontSize: "0.6rem", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.2rem 0.55rem", borderRadius: "20px" }}>{pinnedInsight.type}</span>
                  <span style={{ color: c.textMuted, fontSize: "0.7rem" }}>@ {formatTime(pinnedInsight.timestamp)}</span>
                </div>
                <p style={{ fontWeight: "700", color: c.text, fontSize: "0.95rem", marginBottom: "0.4rem", fontFamily: fonts.heading }}>{pinnedInsight.name}</p>
                <p style={{ color: c.textSub, fontSize: "0.82rem", lineHeight: 1.5, marginBottom: "0.5rem" }}>{pinnedInsight.description}</p>
                <p style={{ color: c.textMuted, fontSize: "0.76rem", fontStyle: "italic", marginBottom: "0.75rem" }}>{pinnedInsight.relevance}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <a href={pinnedInsight.links?.wikipedia} target="_blank" rel="noreferrer" style={{ padding: "0.45rem 0.75rem", background: dark ? colors.purpleDim : "#f0edff", borderRadius: "8px", color: colors.purple, fontSize: "0.78rem", fontWeight: "600", textDecoration: "none", border: `1px solid ${c.borderAccent}` }}>Open Wikipedia →</a>
                  {(pinnedInsight.type === "film" || pinnedInsight.type === "show") && <a href={pinnedInsight.links?.imdb} target="_blank" rel="noreferrer" style={{ padding: "0.45rem 0.75rem", background: dark ? colors.bgCardHover : "#fafafa", borderRadius: "8px", color: c.textSub, fontSize: "0.78rem", textDecoration: "none", border: `1px solid ${c.border}` }}>Search IMDb →</a>}
                  {pinnedInsight.type === "book" && <a href={pinnedInsight.links?.amazon} target="_blank" rel="noreferrer" style={{ padding: "0.45rem 0.75rem", background: dark ? colors.bgCardHover : "#fafafa", borderRadius: "8px", color: c.textSub, fontSize: "0.78rem", textDecoration: "none", border: `1px solid ${c.border}` }}>Find on Amazon →</a>}
                  <button onClick={() => handleTimestampClick(pinnedInsight.timestamp)} style={{ padding: "0.45rem 0.75rem", background: "none", border: `1px solid ${c.border}`, borderRadius: "8px", color: c.textMuted, fontSize: "0.76rem", cursor: "pointer", textAlign: "left", fontFamily: fonts.body }}>Jump to {formatTime(pinnedInsight.timestamp)} in audio</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ SUMMARY & INSIGHTS PANEL ══ */}
        {activeTab === "insights" && (
          <div style={{ background: c.card, borderRadius: "16px", padding: "1.75rem", border: `1px solid ${c.border}`, boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.04)" }}>
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: "700", color: c.text, marginBottom: "0.2rem", fontFamily: fonts.heading }}>Summary & Takeaways</h2>
                  <p style={{ color: c.textMuted, fontSize: "0.8rem" }}>AI summary from transcript + your marked moments</p>
                </div>
                <button onClick={handleGenerateSummary} disabled={isGeneratingSummary || transcript.length === 0} style={{ ...btnPrimary, opacity: isGeneratingSummary || transcript.length === 0 ? 0.5 : 1, cursor: isGeneratingSummary || transcript.length === 0 ? "not-allowed" : "pointer" }}
                  onMouseEnter={(e) => { if (!isGeneratingSummary) e.currentTarget.style.opacity = "0.88"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = isGeneratingSummary || transcript.length === 0 ? "0.5" : "1"; }}>
                  {isGeneratingSummary ? "Generating..." : summary ? "Regenerate" : "Generate Summary"}
                </button>
              </div>
              {!summary && !isGeneratingSummary && (
                <div style={{ padding: "2rem", textAlign: "center", color: c.textMuted, background: dark ? "rgba(255,255,255,0.02)" : "#fafafa", borderRadius: "10px" }}>
                  <p>{transcript.length === 0 ? "Waiting for transcript..." : "Click Generate Summary. Mark moments first for a more personalised result."}</p>
                </div>
              )}
              {isGeneratingSummary && <div style={{ padding: "2rem", textAlign: "center", color: c.textMuted, background: dark ? "rgba(255,255,255,0.02)" : "#fafafa", borderRadius: "10px" }}><p>Building summary with Claude AI...</p></div>}
              {summary && (
                <div style={{ background: dark ? colors.purpleDim : "#f8f7ff", border: `1px solid ${c.borderAccent}`, borderRadius: "12px", padding: "1.25rem" }}>
                  <p style={{ color: c.textSub, fontSize: "0.92rem", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{summary}</p>
                  {markedMoments.length > 0 && (
                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${c.borderAccent}` }}>
                      <p style={{ color: colors.purple, fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>Based on {markedMoments.length} marked moment{markedMoments.length > 1 ? "s" : ""}</p>
                      {markedMoments.map((m, i) => (
                        <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.3rem" }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: "700", textTransform: "uppercase", color: markColor(m.type), flexShrink: 0 }}>{m.type}</span>
                          <span onClick={() => handleTimestampClick(m.time)} style={{ color: colors.purple, fontSize: "0.7rem", fontFamily: fonts.mono, cursor: "pointer", flexShrink: 0 }}>{formatTime(m.time)}</span>
                          <span style={{ color: c.textMuted, fontSize: "0.78rem" }}>{m.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <hr style={{ border: "none", borderTop: `1px solid ${c.border}`, marginBottom: "1.5rem" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: c.text, marginBottom: "0.15rem", fontFamily: fonts.heading }}>Key Insights</h3>
                  <p style={{ color: c.textMuted, fontSize: "0.8rem" }}>Entities from the transcript — click to jump</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ background: dark ? colors.purpleDim : "#f0edff", color: colors.purple, fontSize: "0.7rem", fontWeight: "600", padding: "0.25rem 0.75rem", borderRadius: "20px", border: `1px solid ${c.borderAccent}` }}>AI</span>
                  <button onClick={handleGenerateInsights} disabled={isGeneratingInsights} style={{ ...btnGhost, padding: "0.4rem 0.9rem", fontSize: "0.78rem" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = dark ? colors.purpleDim : "#f0edff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    {isGeneratingInsights ? "Generating..." : "Regenerate"}
                  </button>
                </div>
              </div>
              {insights.length === 0 && !isGeneratingInsights && (
                <div style={{ padding: "1.5rem", textAlign: "center", color: c.textMuted, background: dark ? "rgba(255,255,255,0.02)" : "#fafafa", borderRadius: "10px" }}>
                  <p>Insights appear automatically once transcript is ready.</p>
                </div>
              )}
              {insights.map((insight, index) => (
                <div key={index} onClick={() => handleTimestampClick(insight.timestamp)} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", padding: "1rem 1.25rem", marginBottom: "0.5rem", background: dark ? colors.bgCardHover : "#fafafa", border: `1px solid ${c.border}`, borderRadius: "10px", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderAccent; e.currentTarget.style.background = dark ? colors.purpleDim : "#f8f7ff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.background = dark ? colors.bgCardHover : "#fafafa"; }}
                >
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: dark ? colors.purpleDim : "#f0edff", border: `1px solid ${c.borderAccent}`, color: colors.purple, fontSize: "0.75rem", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{index + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: c.text, fontSize: "0.92rem", fontWeight: "600", marginBottom: "0.2rem" }}>
                      {insight.name}
                      <span style={{ color: c.textMuted, fontSize: "0.75rem", fontWeight: "400", marginLeft: "0.5rem" }}>{insight.type} · {formatTime(insight.timestamp)}</span>
                    </p>
                    <p style={{ color: c.textMuted, fontSize: "0.82rem", margin: 0, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ NOTES PANEL ══ */}
        {activeTab === "notes" && (
          <div style={{ background: c.card, borderRadius: "16px", padding: "1.75rem", border: `1px solid ${c.border}`, boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.04)" }}>
            <div style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: "700", color: c.text, marginBottom: "0.2rem", fontFamily: fonts.heading }}>My Notes</h2>
              <p style={{ color: c.textMuted, fontSize: "0.8rem" }}>Saved with audio timestamp · synced to Notes Library</p>
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ background: dark ? colors.purpleDim : "#f0edff", color: colors.purple, padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontFamily: fonts.mono }}>Writing at {formatTime(currentTime)}</span>
                <span style={{ color: c.textMuted, fontSize: "0.72rem" }}>— timestamp saved with note</span>
              </div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Type your notes here..." rows={5} style={{ width: "100%", background: dark ? colors.bgInput : "#fafafa", border: `1px solid ${c.border}`, borderRadius: "10px", color: c.text, padding: "1rem", fontSize: "0.9rem", fontFamily: fonts.body, resize: "vertical", outline: "none", lineHeight: 1.7, marginBottom: "0.75rem" }} />
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <button onClick={handleSaveNotes} style={{ ...btnPrimary }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>Save Note</button>
                <button onClick={() => setNotes("")} style={{ background: "none", border: `1px solid ${c.border}`, color: c.textMuted, padding: "0.6rem 1.1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.88rem", fontFamily: fonts.body }}>Clear</button>
                {noteSaved && <span style={{ color: colors.teal, fontSize: "0.85rem", fontWeight: "600" }}>Saved! ✓</span>}
              </div>
            </div>
            {savedNotes.length > 0 && (
              <div>
                <p style={{ color: c.textMuted, fontSize: "0.68rem", fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Saved Notes for This Episode</p>
                {savedNotes.map((note) => (
                  <div key={note.id} style={{ background: dark ? colors.bgCardHover : "#fafafa", border: `1px solid ${c.border}`, borderRadius: "10px", padding: "1rem 1.1rem", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span onClick={() => handleTimestampClick(note.timestamp)} style={{ background: dark ? colors.purpleDim : "#f0edff", color: colors.purple, padding: "0.12rem 0.45rem", borderRadius: "4px", fontSize: "0.7rem", fontFamily: fonts.mono, cursor: "pointer" }}>@ {formatTime(note.timestamp)}</span>
                        <span style={{ color: c.textMuted, fontSize: "0.7rem" }}>{note.writtenAt}</span>
                      </div>
                      <button onClick={() => handleDeleteNote(note.id)} style={{ background: "none", border: "none", color: c.textMuted, cursor: "pointer", fontSize: "0.8rem", padding: 0, transition: "color 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = colors.red; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = c.textMuted; }}>✕</button>
                    </div>
                    <p style={{ color: c.textSub, fontSize: "0.88rem", whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>{note.text}</p>
                  </div>
                ))}
                <button onClick={() => navigate("/notes")} style={{ ...btnGhost, marginTop: "0.5rem" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = dark ? colors.purpleDim : "#f0edff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>View Full Notes Library →</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SUGGESTED PODCASTS ── */}
      {showSuggested && !suggestedHidden && (
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 2rem 3rem" }}>
          <div style={{ background: c.card, borderRadius: "16px", padding: "1.5rem", border: `1px solid ${c.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: c.text, marginBottom: "0.15rem", fontFamily: fonts.heading }}>You might also enjoy</h3>
                <p style={{ color: c.textMuted, fontSize: "0.8rem" }}>Similar podcasts to what you just listened to</p>
              </div>
              <button onClick={() => setSuggestedHidden(true)} style={{ background: "none", border: "none", color: c.textMuted, cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>Hide</button>
            </div>
            {suggested.length === 0 ? (
              <p style={{ color: c.textMuted, fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>Loading suggestions...</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "0.75rem" }}>
                {suggested.map((pod) => (
                  <div key={pod.uuid} onClick={() => pod.rssUrl && navigate(`/rss?url=${encodeURIComponent(pod.rssUrl)}`)} style={{ background: dark ? colors.bgCardHover : "#fafafa", border: `1px solid ${c.border}`, borderRadius: "10px", padding: "0.75rem", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderAccent; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; }}>
                    {pod.imageUrl && <img src={pod.imageUrl} alt={pod.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "8px", marginBottom: "0.5rem" }} />}
                    <p style={{ color: c.text, fontSize: "0.82rem", fontWeight: "600", marginBottom: "0.25rem" }}>{pod.name}</p>
                    <p style={{ color: c.textMuted, fontSize: "0.72rem", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{pod.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <p style={{ color: c.textMuted, fontSize: "0.75rem", textAlign: "center", paddingBottom: "2rem" }}>© 2025 PodPlayer</p>

      {/* ── HOVER TOOLTIP ── */}
      {hoveredInsight && !pinnedInsight && (
        <div style={{ position: "absolute", top: tooltipPos.y, left: Math.min(tooltipPos.x, window.innerWidth - 300), width: "280px", background: c.card, border: `1px solid ${c.borderAccent}`, borderRadius: "12px", padding: "0.9rem", boxShadow: dark ? effects.glowPurple : "0 8px 32px rgba(108,71,255,0.12)", zIndex: 9999, pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <span style={{ background: colors.purple, color: "#fff", fontSize: "0.58rem", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.18rem 0.5rem", borderRadius: "20px" }}>{hoveredInsight.type}</span>
            <span style={{ color: c.textMuted, fontSize: "0.68rem" }}>@ {formatTime(hoveredInsight.timestamp)}</span>
          </div>
          <p style={{ fontWeight: "700", color: c.text, fontSize: "0.88rem", marginBottom: "0.3rem", fontFamily: fonts.heading }}>{hoveredInsight.name}</p>
          <p style={{ color: c.textSub, fontSize: "0.78rem", lineHeight: 1.5, marginBottom: "0.3rem" }}>{hoveredInsight.description}</p>
          <p style={{ color: c.textMuted, fontSize: "0.68rem", margin: 0 }}>Click to pin full card →</p>
        </div>
      )}
    </div>
  );
}

export default PlayerPage;
