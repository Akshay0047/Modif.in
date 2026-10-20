import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
    const previousInert = inertHosts.map((child) => child.inert);
    const previousOverflow = document.body.style.overflow;
    inertHosts.forEach((child) => {
      child.inert = true;
    });

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
      inertHosts.forEach((child, index) => {
        child.inert = previousInert[index];
      });
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
          <div className="footer-credit">
            <span>Built by </span>

            <a
              href="https://junaidahamed.runs-on.dev"
              className="cursor-target footer-link"
              target="_blank" rel="noopener noreferrer"
            >
              Junaid
            </a>

            <span> and </span>

            <a
              href="https://akshaysuresh.runs-on.dev"
              className="cursor-target footer-link"
              target="_blank" rel="noopener noreferrer"
            >
              Akshay
            </a>
          </div>

          <nav className="footer-nav" aria-label="Legal">
            <button
              type="button"
              className="cursor-target footer-button"
              onClick={(event) => openDocument("privacy", event)}
            >
              Privacy Policy
            </button>

            <span className="footer-separator">.</span>

            <button
              type="button"
              className="cursor-target footer-button"
              onClick={(event) => openDocument("terms", event)}
            >
              Terms of Service
            </button>

            <span className="footer-separator">.</span>

            <button
              type="button"
              className="cursor-target footer-button"
              onClick={(event) => openDocument("disclaimer", event)}
            >
              Disclaimer
            </button>
          </nav>
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
