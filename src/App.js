/* ─────────────────────────────────────────────────────────────────────────────
   App.js
   Root of the app. Manages global audio state so the mini player persists
   across all pages — audio keeps playing even when navigating away.
   Also manages light/dark mode toggle stored in localStorage.
───────────────────────────────────────────────────────────────────────────── */
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import EpisodeList from "./pages/EpisodeList";
import PlayerPage from "./pages/PlayerPage";
import RSSPage from "./pages/RSSPage";
import NotesLibrary from "./pages/NotesLibrary";
import MiniPlayer from "./components/MiniPlayer";

function App() {
  /* ── DARK/LIGHT MODE ─────────────────────────────────────────────────────
     Reads from localStorage so it persists across refreshes.
     Default is dark mode.                                                  */
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("podplayer_theme");
    return saved ? saved === "dark" : true;
  });

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("podplayer_theme", next ? "dark" : "light");
      return next;
    });
  }

  /* ── GLOBAL AUDIO STATE ──────────────────────────────────────────────────
     The audio element lives here so it survives page navigation.
     PlayerPage and MiniPlayer both share this ref and state.               */
  const audioRef = useRef(new Audio());
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  /* ── WIRE UP AUDIO EVENTS ── */
  useEffect(() => {
    const audio = audioRef.current;

    function onTimeUpdate() { setCurrentTime(audio.currentTime); }
    function onDurationChange() { setDuration(audio.duration || 0); }
    function onEnded() { setIsPlaying(false); }
    function onPlay() { setIsPlaying(true); }
    function onPause() { setIsPlaying(false); }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  /* ── LOAD A NEW EPISODE INTO THE GLOBAL PLAYER ── */
  function loadEpisode(episode) {
    const audio = audioRef.current;
    if (currentEpisode?.guid === episode.guid) {
      /* Same episode — just toggle play/pause */
      if (isPlaying) { audio.pause(); } else { audio.play(); }
      return;
    }
    /* New episode — swap the source and start playing */
    audio.src = episode.audioSrc;
    audio.load();
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
    setCurrentEpisode(episode);
  }

  function handlePlayPause() {
    const audio = audioRef.current;
    if (isPlaying) { audio.pause(); } else { audio.play(); }
  }

  function handleSeek(time) {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }

  /* ── SHARED PROPS passed down to every page ── */
  const audioProps = {
    audioRef,
    currentEpisode,
    setCurrentEpisode,
    loadEpisode,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    handlePlayPause,
    handleSeek,
    isDark,
    toggleTheme,
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EpisodeList {...audioProps} />} />
        <Route path="/player/:id" element={<PlayerPage {...audioProps} />} />
        <Route path="/rss" element={<RSSPage {...audioProps} />} />
        <Route path="/notes" element={<NotesLibrary {...audioProps} />} />
      </Routes>

      {/* Mini player — only shows when an episode is loaded and user has navigated away */}
      <MiniPlayer {...audioProps} />
    </BrowserRouter>
  );
}

export default App;
