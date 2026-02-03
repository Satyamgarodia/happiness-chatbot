import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleGeminiEffectDemo } from "./Home";
import Chatbot from "./components/ui/Chatbot";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GoogleGeminiEffectDemo />} />
        <Route path="/chat" element={<Chatbot />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
