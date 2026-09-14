import Silk from "./components/Silk";
import ToolHub from "./sections/ToolHub";
import Footer from "./sections/Footer";
import "./App.css";

function App() {
    return (
        <main className="app">
            <Silk speed={5} scale={1} noiseIntensity={1.5} />
            <ToolHub />
            <Footer />
        </main>
    );
}

export default App;
