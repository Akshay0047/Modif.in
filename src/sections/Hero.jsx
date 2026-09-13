import DepthText from "../components/DepthText";
import "./Hero.css";

function Hero() {
  return (
    <section className="hero">
      <DepthText
        text="MODIF.in"
        layers={28}
        depth={1.9}
        faceColor="#f8fafc"
        depthColor="#13008f"
        tilt={0}
        pointerTracking
        smoothing={0.22}
        perspective={475}
        autoOrbit
        orbitSpeed={0.35}
        fontSize="clamp(3rem, 12vw, 7rem)"
        fontWeight={800}
        shadow
      />

      <p className="hero-subtitle">
        Simple tools for images, text, and typing.
      </p>
    </section>
  );
}

export default Hero;