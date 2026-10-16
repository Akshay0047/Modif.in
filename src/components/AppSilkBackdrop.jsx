import Silk from "./Silk";
import "./AppSilkBackdrop.css";

function AppSilkBackdrop({ visible, color1, color2 }) {
    const backgroundStyle = {
        background: `linear-gradient(145deg, ${color1} 0%, ${color2} 55%, ${color1} 100%)`,
    };

    return (
        <div
            className={`app-silk-backdrop${visible ? " app-silk-backdrop--visible" : " app-silk-backdrop--warmup"}`}
            style={backgroundStyle}
            aria-hidden="true"
        >
            <Silk
                speed={5}
                scale={1}
                noiseIntensity={1.5}
                color1={color1}
                color2={color2}
            />
        </div>
    );
}

export default AppSilkBackdrop;
