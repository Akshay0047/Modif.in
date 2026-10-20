import { Component, Suspense, useEffect, useLayoutEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { markPageReady } from "../utils/pageReadiness";
import "./RouteContent.css";

function RecoveryLinks() {
    return <nav aria-label="Loading recovery">
        <Link className="cursor-target" to="/">Home</Link>
        <Link className="cursor-target" to="/text">Text tools</Link>
        <Link className="cursor-target" to="/image">Image tools</Link>
        <Link className="cursor-target" to="/doc">Document tools</Link>
    </nav>;
}

function RouteLoadError() {
    useEffect(() => { document.title = "Page could not load | MODIF.in"; }, []);
    return <section className="route-feedback" role="alert">
        <h1>This page could not load</h1>
        <p>Check your connection, then reload to try again. You can also choose another hub.</p>
        <button className="cursor-target" type="button" onClick={() => window.location.reload()}>Reload page</button>
        <RecoveryLinks />
    </section>;
}

class RouteErrorBoundary extends Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? <RouteLoadError /> : this.props.children; }
}

function PageReady() {
    const { pathname } = useLocation();
    useLayoutEffect(() => { markPageReady(pathname); }, [pathname]);
    return null;
}

function RouteContent({ children }) {
    const { pathname } = useLocation();
    return <RouteErrorBoundary key={pathname}>
        <Suspense fallback={<section className="route-feedback" role="status">
            <h1>Loading page…</h1>
            <p>Preparing your workspace.</p>
            <RecoveryLinks />
        </section>}>
            {children}
            <PageReady />
        </Suspense>
    </RouteErrorBoundary>;
}

export default RouteContent;
