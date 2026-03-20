import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WaitlistPage } from "./pages/WaitlistPage";
import { HomePage } from "./pages/HomePage";
import { AgentPage } from "./pages/AgentPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WaitlistPage />} />
        <Route path="/app" element={<HomePage />} />
        <Route path="/agent/:id" element={<AgentPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
