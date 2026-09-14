import { useEffect, useState } from "react";
import logo from "../logo.png";
import "./IntroScreen.css";

function IntroScreen() {
  const [started, setStarted] = useState(false);
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    document.body.classList.add("intro-active");

    // Wait for the browser to paint the initial hidden state,
    // then start the 150ms logo fade-in.
    const startFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setStarted(true);
      });
    });

    // 150ms fade-in + 350ms hold = 500ms
    const fadeTimer = window.setTimeout(() => {
      setFading(true);
    }, 500);

    // 500ms + 250ms fade-out = 750ms total
    const removeTimer = window.setTimeout(() => {
      setVisible(false);
      document.body.classList.remove("intro-active");
    }, 750);

    return () => {
      cancelAnimationFrame(startFrame);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
      document.body.classList.remove("intro-active");
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className={`intro-screen ${fading ? "intro-screen--fading" : ""}`}>
      <img
        src={logo}
        alt="Modif.in"
        className={`intro-logo ${started ? "intro-logo--visible" : ""}`}
      />
    </div>
  );
}

export default IntroScreen;