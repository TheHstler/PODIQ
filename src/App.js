import { BrowserRouter, Routes, Route } from "react-router-dom";
import EpisodeList from "./pages/EpisodeList";
import PlayerPage from "./pages/PlayerPage";
/* RSSPage lets users load any podcast by pasting its RSS feed URL */
import RSSPage from "./pages/RSSPage";
import NotesLibrary from "./pages/NotesLibrary";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home — hardcoded episode list */}
        <Route path="/" element={<EpisodeList />} />

        {/* Player — works for both hardcoded and RSS episodes */}
        <Route path="/player/:id" element={<PlayerPage />} />

        {/* RSS loader — paste a feed URL to browse any podcast */}
        <Route path="/rss" element={<RSSPage />} />

        <Route path="/notes" element={<NotesLibrary />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
