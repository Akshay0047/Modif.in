import { useEffect, useState } from "react";
import logo from "../logo.png";
import "./IntroScreen.css";

function IntroScreen() {
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Hide both the native cursor and the custom TargetCursor
    // while the intro screen is visible.
    document.body.classList.add("intro-active");

    const fadeTimer = window.setTimeout(() => {
      setFading(true);
    }, 750);

    const removeTimer = window.setTimeout(() => {
      setVisible(false);
      document.body.classList.remove("intro-active");
    }, 1000);

    return () => {
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
        className="intro-logo"
      />
    </div>
  );
}

export default IntroScreen;