import { useNavigate } from "react-router-dom"; //React router tool - sends user to differnt page when they click something 
import episodes from "../data/episodes";  // pulls in hardcoded data from episodes.js 

function EpisodeList() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>

      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎙️ Podcast Episodes</h1>
      <p style={{ color: "#999", marginBottom: "2rem" }}>Select an episode to start listening</p>

      {episodes.map((episode) => ( // loops through all 3 spisodes and draws a card for each one automatically 
        <div
          key={episode.id}
          onClick={() => navigate(`/player/${episode.id}`)} // when card id clicked; it sends the user to that player page for that episode 
          style={{
            display: "flex",
            gap: "1.5rem",
            alignItems: "center",
            background: "#1a1a1a",
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1rem",
            cursor: "pointer",
            border: "1px solid #2a2a2a",
            transition: "border-color 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#888"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a2a"}  // makes the card border ligth up when you hover over it
        >
          <img
            src={episode.image}
            alt={episode.title}
            style={{ width: "100px", height: "75px", borderRadius: "8px", objectFit: "cover" }}
          />
          <div>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.4rem" }}>{episode.title}</h2>
            <p style={{ color: "#aaa", fontSize: "0.9rem", marginBottom: "0.4rem" }}>{episode.description}</p>
            <span style={{ color: "#666", fontSize: "0.8rem" }}>⏱ {episode.duration}</span>
          </div>
        </div>
      ))}

    </div>
  );
}

export default EpisodeList;