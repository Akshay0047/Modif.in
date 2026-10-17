import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { decodeJwt, safeExecute } from "../_shared/developerUtils";

function JwtDecoder() {
    const [token, setToken] = useState("");

    const result = useMemo(
        () => safeExecute("jwt", () => decodeJwt(token)),
        [token],
    );

    const decoded = result.ok ? result.value : null;

    return (
        <TextToolShell
            title="JWT Decoder"
            description="Decode JSON Web Tokens to inspect the header, payload, expiration, and claims."
            leading={<BackButton />}
            privacySensitive
        >
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="jwt-decoder-input">
                    JWT token
                </label>
                <textarea
                    id="jwt-decoder-input"
                        aria-invalid={Boolean(result.error)}
                        aria-describedby={result.error ? "jwt-input-error" : undefined}
                    className="text-tool-textarea"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="Paste a JWT token…"
                    spellCheck={false}
                />
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Decoded token</h2>
                    {decoded ? (
                        <CopyButton
                            text={JSON.stringify(decoded, null, 2)}
                            label="Copy decoded JSON"
                        />
                    ) : null}
                </div>

                {result.error ? (
                    <p id="jwt-input-error" className="text-tool-empty" role="alert">{result.error}</p>
                ) : decoded ? (
                    <div className="text-tool-info-grid">
                        <div className="text-tool-info-row">
                            <span className="text-tool-info-row__label">Header</span>
                            <span className="text-tool-info-row__value">
                                <pre>{JSON.stringify(decoded.header, null, 2)}</pre>
                            </span>
                        </div>
                        <div className="text-tool-info-row">
                            <span className="text-tool-info-row__label">Payload</span>
                            <span className="text-tool-info-row__value">
                                <pre>{JSON.stringify(decoded.payload, null, 2)}</pre>
                            </span>
                        </div>
                        <div className="text-tool-info-row">
                            <span className="text-tool-info-row__label">Expiration</span>
                            <span className="text-tool-info-row__value">
                                {decoded.expirationError ? (
                                    <span role="status">{decoded.expirationError}</span>
                                ) : decoded.expiration ?? "No exp claim"}
                            </span>
                        </div>
                        <div className="text-tool-info-row">
                            <span className="text-tool-info-row__label">Claims</span>
                            <span className="text-tool-info-row__value">
                                <pre>{JSON.stringify(decoded.claims, null, 2)}</pre>
                            </span>
                        </div>
                    </div>
                ) : (
                    <p className="text-tool-empty">Paste a JWT token to decode it.</p>
                )}
            </div>
        </TextToolShell>
    );
}

export default JwtDecoder;
