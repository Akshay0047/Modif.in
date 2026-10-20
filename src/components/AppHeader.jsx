import { Link, NavLink } from "react-router-dom";
import DepthText from "./DepthText";
import { useAnimationSettings } from "../contexts/AnimationContext";
import "./AppHeader.css";

export default function AppHeader() {
    const { enabled, reducedMotion, toggle } = useAnimationSettings();
    return (
        <header className="app-header">
            <Link className="app-header__brand cursor-target" to="/" aria-label="MODIF.in home" translate="no">
                <DepthText text="MODIF.in" layers={8} depth={0.5} fontSize="1.4rem" fontWeight={800}
                    depthColor="#13008f" pointerTracking={false} autoOrbit={false} shadow={false} />
            </Link>
            <nav className="app-header__nav" aria-label="Tool hubs">
                <NavLink className="cursor-target" to="/text">Text</NavLink>
                <NavLink className="cursor-target" to="/image">Image</NavLink>
                <NavLink className="cursor-target" to="/doc">Docs</NavLink>
            </nav>
            <button className="app-header__motion cursor-target" type="button" onClick={toggle}
                disabled={reducedMotion} aria-pressed={!enabled}
                aria-label={reducedMotion ? "Animation disabled by reduced motion preference" : enabled ? "Pause animation" : "Resume animation"}
                title={reducedMotion ? "Your device requests reduced motion" : enabled ? "Pause animation" : "Resume animation"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    {enabled ? <><path d="M8 5v14M16 5v14" /></> : <path d="m8 5 11 7-11 7Z" />}
                </svg>
            </button>
        </header>
    );
}
