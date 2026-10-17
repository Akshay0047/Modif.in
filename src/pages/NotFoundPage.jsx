import { Link } from "react-router-dom";
import "./NotFoundPage.css";

function NotFoundPage() {
    return (
        <section className="not-found-page" aria-labelledby="not-found-title">
            <h1 id="not-found-title">Page not found</h1>
            <p>This address does not match a page or tool. Choose a hub to find what you need.</p>
            <nav aria-label="Page recovery">
                <Link className="cursor-target" to="/">Home</Link>
                <Link className="cursor-target" to="/text">Text tools</Link>
                <Link className="cursor-target" to="/image">Image tools</Link>
                <Link className="cursor-target" to="/doc">Document tools</Link>
            </nav>
        </section>
    );
}

export default NotFoundPage;
