import Dither from "./components/Dither";

function App() {
  return (
    <main className="app">
      <Dither
        waveColor={[0.21568627450980393, 0.7254901960784313, 0.6509803921568628]}
        disableAnimation={false}
        enableMouseInteraction={true}
        mouseRadius={0.1}
        colorNum={4.5}
        waveAmplitude={0.28}
        waveFrequency={4.8}
        waveSpeed={0.03}
        backgroundColor={[0, 0, 0]}
      />
    </main>
  );
}

export default App;