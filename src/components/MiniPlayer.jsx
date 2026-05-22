/* ─────────────────────────────────────────────────────────────────────────────
   src/components/MiniPlayer.jsx
   Sticky mini player bar at the bottom of the screen.
   Appears when an episode is loaded AND the user is not on the player page.
   Keeps audio playing across all pages.
───────────────────────────────────────────────────────────────────────────── */
import { useNavigate, useLocation } from "react-router-dom";
import { colors, fonts, effects } from "../styles/theme";

function MiniPlayer({
  currentEpisode,
  isPlaying,
  handlePlayPause,
  currentTime,
  duration,
  handleSeek,
  isDark,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  /* Don't show mini player on the player page itself — it has its own controls */
  const onPlayerPage = location.pathname.startsWith("/player");
  if (!currentEpisode || onPlayerPage) return null;

  const c = isDark ? colors : lightColors;

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{
      position: "fixed",
      bottom: 0, left: 0, right: 0,
      zIndex: 500,
      background: isDark
        ? "rgba(26,26,32,0.97)"
        : "rgba(255,255,255,0.97)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: isDark
        ? "1px solid rgba(139,92,246,0.3)"
        : "1px solid rgba(108,71,255,0.15)",
      boxShadow: isDark
        ? "0 -8px 40px rgba(139,92,246,0.15)"
        : "0 -4px 24px rgba(0,0,0,0.08)",
    }}>
      {/* Progress bar at very top of mini player */}
      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          handleSeek(((e.clientX - rect.left) / rect.width) * duration);
        }}
        style={{
          width: "100%", height: "3px",
          background: isDark ? "rgba(255,255,255,0.08)" : "#ebebeb",
          cursor: "pointer", position: "relative",
        }}
      >
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, #8B5CF6, #A78BFA)",
          transition: "width 0.1s linear",
        }} />
      </div>

      {/* Main mini player content */}
      <div style={{
        maxWidth: "1200px", margin: "0 auto",
        padding: "0.75rem 2rem",
        display: "flex", alignItems: "center", gap: "1rem",
      }}>
        {/* Artwork — click to go back to player page */}
        <div
          onClick={() => navigate(`/player/${encodeURIComponent(currentEpisode.guid)}`, { state: { episode: currentEpisode } })}
          style={{ cursor: "pointer", flexShrink: 0, position: "relative" }}
        >
          {currentEpisode.image && (
            <img
              src={currentEpisode.image}
              alt={currentEpisode.title}
              style={{
                width: "44px", height: "44px", borderRadius: "8px",
                objectFit: "cover",
                border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #ebebeb",
              }}
            />
          )}
          {/* Pulsing dot when playing */}
          {isPlaying && (
            <div style={{
              position: "absolute", bottom: "-2px", right: "-2px",
              width: "8px", height: "8px", borderRadius: "50%",
              background: "#6EE7B7",
              boxShadow: "0 0 6px #6EE7B7",
              animation: "miniPulse 1.5s infinite",
            }} />
          )}
        </div>

        {/* Episode info */}
        <div
          onClick={() => navigate(`/player/${encodeURIComponent(currentEpisode.guid)}`, { state: { episode: currentEpisode } })}
          style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
        >
          <p style={{
            color: isDark ? colors.textPrimary : "#1a1a2e",
            fontSize: "0.85rem", fontWeight: "600",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            marginBottom: "0.15rem", fontFamily: fonts.heading,
          }}>
            {currentEpisode.title}
          </p>
          <p style={{
            color: isDark ? colors.textMuted : "#888",
            fontSize: "0.72rem", fontFamily: fonts.mono,
          }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </p>
        </div>

        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: "linear-gradient(135deg, #8B5CF6, #A78BFA)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 16px rgba(139,92,246,0.4)",
            flexShrink: 0, transition: "transform 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        {/* Go to full player */}
        <button
          onClick={() => navigate(`/player/${encodeURIComponent(currentEpisode.guid)}`, { state: { episode: currentEpisode } })}
          style={{
            background: "none",
            border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #ebebeb",
            color: isDark ? colors.textMuted : "#888",
            padding: "0.4rem 0.75rem", borderRadius: "8px",
            cursor: "pointer", fontSize: "0.75rem", fontWeight: "500",
            flexShrink: 0, whiteSpace: "nowrap",
            fontFamily: fonts.body,
          }}
        >
          Open →
        </button>
      </div>

      <style>{`@keyframes miniPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }`}</style>
    </div>
  );
}

/* Light mode colour fallback */
const lightColors = {
  textPrimary: "#1a1a2e",
  textMuted: "#888",
};

export default MiniPlayer;
