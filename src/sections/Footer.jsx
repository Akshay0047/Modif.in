import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { acquireInert } from "../utils/inertLock";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import "./Footer.css";

import privacyPolicy from "../footer/privacypolicy.md?raw";
import termsOfService from "../footer/termsofservice.md?raw";
import disclaimer from "../footer/disclaimer.md?raw";

const ReactMarkdown = lazy(() => import("react-markdown"));

const documents = {
  privacy: {
    title: "Privacy Policy",
    content: privacyPolicy,
  },
  terms: {
    title: "Terms of Service",
    content: termsOfService,
  },
  disclaimer: {
    title: "Disclaimer",
    content: disclaimer,
  },
};

function ExternalFooterLink({ href, children }) {
  return (
    <a
      href={href}
      className="cursor-target footer-link"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <svg className="footer-external-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M7 17 17 7M7 7h10v10" />
      </svg>
      <span className="footer-sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Footer() {
  const [activeDocument, setActiveDocument] = useState(null);
  const openerRef = useRef(null);
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!activeDocument) return undefined;

    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    if (!overlay || !dialog) return undefined;
    const parent = overlay?.parentElement;
    const inertHosts = parent
      ? [...parent.children].filter((child) => child !== overlay)
      : [];
    const releaseInert = inertHosts.map((child) => acquireInert(child));
    const previousOverflow = document.body.style.overflow;

    const focusable = () => [...dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )].filter((element) => !element.hasAttribute("disabled"));

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveDocument(null);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    focusable()[0]?.focus();

    return () => {
      releaseInert.forEach((release) => release());
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      openerRef.current?.focus();
    };
  }, [activeDocument]);

  const openDocument = (documentKey, event) => {
    openerRef.current = event.currentTarget;
    setActiveDocument(documents[documentKey]);
  };

  const closeDocument = () => {
    setActiveDocument(null);
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      closeDocument();
    }
  };

  return (
    <>
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-main">
            <div className="footer-about">
              <Link to="/" className="cursor-target footer-brand" aria-label="MODIF.in home">
                <img src="/favicon.ico" width="48" height="48" alt="" />
                <span translate="no">MODIF.in</span>
              </Link>
              <p className="footer-tagline">Simple tools for your digital world.</p>
              <p className="footer-description">Everyday utilities for text, images, and documents. Free to use, with no account required.</p>
            </div>

            <nav className="footer-group" aria-label="Explore tools">
              <h2>Explore tools</h2>
              <ul>
                <li><Link to="/text" className="cursor-target footer-link">Text tools</Link></li>
                <li><Link to="/image" className="cursor-target footer-link">Image tools</Link></li>
                <li><Link to="/doc" className="cursor-target footer-link">Document tools</Link></li>
              </ul>
            </nav>

            <nav className="footer-group" aria-label="Tool shortcuts">
              <h2>Common tasks</h2>
              <ul>
                <li><Link to="/text/text-counter" className="cursor-target footer-link">Count words</Link></li>
                <li><Link to="/image/compress-image" className="cursor-target footer-link">Compress image</Link></li>
                <li><Link to="/doc/pdf-merger" className="cursor-target footer-link">Merge PDFs</Link></li>
              </ul>
            </nav>

            <nav className="footer-group footer-legal" aria-label="Legal">
              <h2>Legal</h2>
              <ul>
                {Object.entries(documents).map(([key, { title }]) => (
                  <li key={key}>
                    <button
                      type="button"
                      className="cursor-target footer-button"
                      aria-haspopup="dialog"
                      onClick={(event) => openDocument(key, event)}
                    >
                      {title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="footer-bottom">
            <p className="footer-copyright">© {new Date().getFullYear()} MODIF.in</p>
            <p className="footer-support">
              Support: <a className="cursor-target footer-link" href="mailto:junuhammad2@gmail.com">junuhammad2@gmail.com</a>
            </p>
            <p className="footer-credit">
              Built by <ExternalFooterLink href="https://junaidahamed.runs-on.dev">Junaid</ExternalFooterLink>
              {" and "}<ExternalFooterLink href="https://akshaysuresh.runs-on.dev">Akshay</ExternalFooterLink>
            </p>
          </div>
        </div>
      </footer>

      {activeDocument && createPortal(
        <div
          className="document-overlay"
          ref={overlayRef}
          onMouseDown={handleBackdropClick}
        >
          <div
            className="document-modal"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="document-modal-header">
              <h2 id="document-modal-title">
                {activeDocument.title}
              </h2>

              <button
                type="button"
                className="cursor-target document-close"
                onClick={closeDocument}
                aria-label="Close document"
              >
                ×
              </button>
            </div>

            <div className="document-content">
              <Suspense fallback={<p role="status">Loading document…</p>}><ReactMarkdown>
                {activeDocument.content}
              </ReactMarkdown></Suspense>
            </div>
          </div>
        </div>, document.body
      )}
    </>
  );
}

export default Footer;
