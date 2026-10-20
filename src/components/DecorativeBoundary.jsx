import { Component } from "react";
import { markSceneFailed } from "../utils/pageReadiness";

// Optional effects must never take the workspace down when a cached chunk is
// unavailable or its renderer cannot mount. Their parent keeps its fallback.
export default class DecorativeBoundary extends Component {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch() {
        markSceneFailed(this.props.scene);
    }

    render() {
        return this.state.failed ? null : this.props.children;
    }
}
