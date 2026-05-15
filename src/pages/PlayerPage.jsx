import { useParams, useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import episodes from "../data/episodes";

function PlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  const episode = episodes.find((ep) => ep.id === parseInt(id));

  if (!episode) {
    return <div style={{ padding: "2rem" }}>Episode not found.</div>;
  }

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

  function handleSaveNotes() {
    setSavedNotes(notes);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);  // automatically hides the confirmation after 2 seconds
  }

  function handleClearNotes() {
    setNotes("");
    setSavedNotes("");
    setNoteSaved(false);
  }

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem" }}>

      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        style={{
          background: "none",
          border: "1px solid #444",
          color: "#f0ece4",
          padding: "0.5rem 1rem",
          borderRadius: "8px",
          cursor: "pointer",
          marginBottom: "1.5rem",
          fontSize: "0.9rem",
        }}
      >
        ← Back to Episodes
      </button>

      {/* Episode image and info */}
      <img
        src={episode.image}
        alt={episode.title}
        style={{ width: "100%", borderRadius: "12px", marginBottom: "1rem" }}
      />
      <h1 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>{episode.title}</h1>
      <p style={{ color: "#aaa", marginBottom: "2rem" }}>{episode.description}</p>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={episode.audioSrc} />

      {/* Player controls */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "1rem",
        marginBottom: "2rem",
      }}>
        <button onClick={handleRewind} style={buttonStyle}>⏪ 10s</button>
        <button onClick={handlePlayPause} style={{ ...buttonStyle, background: "#f0ece4", color: "#0f0f0f", fontWeight: "bold" }}>
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <button onClick={handleFastForward} style={buttonStyle}>10s ⏩</button>
      </div>

      {/* Transcript */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", borderBottom: "1px solid #2a2a2a", paddingBottom: "0.5rem" }}>
          📄 Transcript
        </h2>

        {episode.transcript.map((line, index) => (
          <div
            key={index}
            onClick={() => handleTimestampClick(line.time)}
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "flex-start",
              padding: "0.75rem",
              marginBottom: "0.5rem",
              borderRadius: "8px",
              cursor: "pointer",
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#888"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a2a"}
          >
            <span style={{
              color: "#f0ece4",
              background: "#2a2a2a",
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.8rem",
              whiteSpace: "nowrap",
              fontFamily: "monospace",
            }}>
              {formatTime(line.time)}
            </span>
            <p style={{ color: "#ccc", fontSize: "0.95rem", margin: 0 }}>{line.text}</p>
          </div>
        ))}
      </div>

      {/* Notes section */}
      <div>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", borderBottom: "1px solid #2a2a2a", paddingBottom: "0.5rem" }}>
          📝 My Notes
        </h2>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)} //every keystroke updates the notes variable in real time
          placeholder="Type your notes about this episode here..."
          rows={5}
          style={{
            width: "100%",
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: "8px",
            color: "#f0ece4",
            padding: "1rem",
            fontSize: "0.95rem",
            resize: "vertical",
            fontFamily: "Georgia, serif",
            marginBottom: "0.75rem",
          }}
        />

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button onClick={handleSaveNotes} style={{ ...buttonStyle, background: "#f0ece4", color: "#0f0f0f", fontWeight: "bold" }}>
            💾 Save Notes
          </button>
          <button onClick={handleClearNotes} style={buttonStyle}>
            🗑 Clear
          </button>
          {noteSaved && (
            <span style={{ color: "#88cc88", fontSize: "0.9rem" }}>✓ Notes saved!</span>
          )}
        </div>

        {/* Display saved notes */}
        {savedNotes !== "" && ( //  stores the notes once the user clicks Save
          <div style={{
            marginTop: "1.5rem",
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: "8px",
            padding: "1rem",
          }}>
            <h3 style={{ fontSize: "0.9rem", color: "#888", marginBottom: "0.5rem" }}>SAVED NOTES</h3>
            <p style={{ color: "#ccc", fontSize: "0.95rem", whiteSpace: "pre-wrap" }}>{savedNotes}</p>
          </div>
        )}
      </div>

    </div>
  );
} //  whiteSpace: "pre-wrap" -- makes sure line breaks the user typed are preserved when displaying saved notes

const buttonStyle = {
  background: "#1a1a1a",
  border: "1px solid #444",
  color: "#f0ece4",
  padding: "0.75rem 1.25rem",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "1rem",
};

export default PlayerPage;