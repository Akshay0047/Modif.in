import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ImageTools from "./pages/ImageTools";
import TextTools from "./pages/TextTools";
import DocTools from "./pages/DocTools";

function App() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/image" element={<ImageTools />} />
            <Route path="/text" element={<TextTools />} />
            <Route path="/doc" element={<DocTools />} />
        </Routes>
    );
}

export default App;
