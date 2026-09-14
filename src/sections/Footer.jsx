import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./Footer.css";

import privacyPolicy from "../footer/privacypolicy.md?raw";
import termsOfService from "../footer/termsofservice.md?raw";
import disclaimer from "../footer/disclaimer.md?raw";

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

  useEffect(() => {
    if (!activeDocument) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveDocument(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDocument]);

  const openDocument = (documentKey) => {
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
              href="https://github.com/JunaidAhamed-7777"
              className="cursor-target footer-link"
              target = "_blank"
            >
              Junaid
            </a>

            <span> and </span>

            <a
              href="https://github.com/Akshay0047"
              className="cursor-target footer-link"
              target = "_blank"
            >
              Akshay
            </a>
          </div>

          <nav className="footer-nav" aria-label="Legal">
            <button
              type="button"
              className="cursor-target footer-button"
              onClick={() => openDocument("privacy")}
            >
              Privacy Policy
            </button>

            <span className="footer-separator">.</span>

            <button
              type="button"
              className="cursor-target footer-button"
              onClick={() => openDocument("terms")}
            >
              Terms of Service
            </button>

            <span className="footer-separator">.</span>

            <button
              type="button"
              className="cursor-target footer-button"
              onClick={() => openDocument("disclaimer")}
            >
              Disclaimer
            </button>
          </nav>
        </div>
      </footer>

      {activeDocument && (
        <div
          className="document-overlay"
          onMouseDown={handleBackdropClick}
        >
          <div
            className="document-modal"
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
              <ReactMarkdown>
                {activeDocument.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Footer;