import { lazy, Suspense } from "react";
import { useAnimationSettings } from "../contexts/AnimationContext";
import useCursorSupport from "../hooks/useCursorSupport";
import DecorativeBoundary from "./DecorativeBoundary";

const TargetCursor = lazy(() => import("./TargetCursor"));

// Eligibility is checked before the dynamic import runs. The native cursor
// remains available until the real cursor has loaded and mounted.
export default function CursorLayer(props) {
    const { active = true, reducedMotion } = useAnimationSettings();
    const supported = useCursorSupport();
    if (!active || reducedMotion || !supported) return null;
    return <DecorativeBoundary><Suspense fallback={null}><TargetCursor {...props} /></Suspense></DecorativeBoundary>;
}
