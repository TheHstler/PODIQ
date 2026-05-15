import { BrowserRouter, Routes, Route } from "react-router-dom";
import EpisodeList from "./pages/EpisodeList";
import PlayerPage from "./pages/PlayerPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EpisodeList />} />
        <Route path="/player/:id" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;