import DitherBackground from "./components/Dither";
import ToolHub from "./sections/ToolHub";
import Footer from "./sections/Footer";
import "./App.css";

function App() {
    return (
        <main className="app">
            <DitherBackground
                waveColor={[
                    0.3215686274509804, 0.3607843137254902, 0.7764705882352941,
                ]}
                disableAnimation={false}
                enableMouseInteraction
                mouseRadius={0.1}
                colorNum={6.2}
                waveAmplitude={0.28}
                waveFrequency={4.6}
                waveSpeed={0.04}
                backgroundColor={[0, 0, 0]}
            />

            <ToolHub />
            <Footer />
        </main>
    );
}

export default App;
