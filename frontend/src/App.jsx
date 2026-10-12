import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import SavedPanel from "./components/SavedPanel";
import Home from "./pages/Home";
import Compare from "./pages/Compare";
import Login from "./pages/Login";
import Register from "./pages/Register";
import LigandExplorer from "./pages/LigandExplorer";
import ProteinExplorer from "./pages/ProteinExplorer";

function App() {
  const [savedOpen, setSavedOpen] = useState(false);

  return (
    <>
      <Header onOpenSaved={() => setSavedOpen(true)} />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ligands" element={<LigandExplorer />} />
          <Route path="/proteins" element={<ProteinExplorer />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
      <SavedPanel open={savedOpen} onClose={() => setSavedOpen(false)} />
    </>
  );
}

export default App;
