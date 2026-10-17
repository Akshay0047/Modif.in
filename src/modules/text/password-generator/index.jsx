import { useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import useGeneratedResult from "../_shared/useGeneratedResult";
import {
    calculatePassphraseEntropy,
    generatePassphrase,
    generatePassword,
} from "../_shared/generatorUtils";

function generateCredential(mode, length, wordCount, uppercase, lowercase, numbers, symbols, excludeAmbiguous, separator, capitalizeWords) {
    return mode === "passphrase"
        ? generatePassphrase({ wordCount, separator, capitalize: capitalizeWords })
        : generatePassword({ length, uppercase, lowercase, numbers, symbols, excludeAmbiguous });
}

function PasswordGenerator() {
    const [mode, setMode] = useState("password");
    const [length, setLength] = useState(16);
    const [wordCount, setWordCount] = useState(6);
    const [uppercase, setUppercase] = useState(true);
    const [lowercase, setLowercase] = useState(true);
    const [numbers, setNumbers] = useState(true);
    const [symbols, setSymbols] = useState(true);
    const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
    const [separator, setSeparator] = useState("-");
    const [capitalizeWords, setCapitalizeWords] = useState(false);

    const result = useGeneratedResult(generateCredential, [
        mode, length, wordCount, uppercase, lowercase, numbers, symbols,
        excludeAmbiguous, separator, capitalizeWords,
    ]);

    const output = result.ok ? result.value : "";
    const entropy = calculatePassphraseEntropy(wordCount, separator, capitalizeWords);

    return (
        <TextToolShell
            title="Password Generator"
            description="Generate secure passwords and passphrases with customizable length and character sets."
            leading={<BackButton />}
            privacySensitive
        >
            <div className="text-tool-panel">
                <div className="text-tool-controls">
                    <button
                        type="button"
                        className={`text-tool-button cursor-target${
                            mode === "password" ? " is-active" : ""
                        }`}
                        onClick={() => setMode("password")}
                    >
                        Password
                    </button>
                    <button
                        type="button"
                        className={`text-tool-button cursor-target${
                            mode === "passphrase" ? " is-active" : ""
                        }`}
                        onClick={() => setMode("passphrase")}
                    >
                        Passphrase
                    </button>
                    <button
                        type="button"
                        className="text-tool-button cursor-target"
                        onClick={result.regenerate}
                    >
                        Regenerate
                    </button>
                </div>

                {mode === "password" ? (
                    <>
                        <label className="text-tool-label" htmlFor="password-length">
                            Length: {length}
                        </label>
                        <input
                            id="password-length"
                            className="text-tool-range"
                            type="range"
                            min={8}
                            max={64}
                            value={length}
                            onChange={(event) =>
                                setLength(Number(event.target.value))
                            }
                        />
                        <div className="text-tool-checkbox-grid">
                            {[
                                ["uppercase", "Uppercase", uppercase, setUppercase],
                                ["lowercase", "Lowercase", lowercase, setLowercase],
                                ["numbers", "Numbers", numbers, setNumbers],
                                ["symbols", "Symbols", symbols, setSymbols],
                                [
                                    "ambiguous",
                                    "Exclude ambiguous characters",
                                    excludeAmbiguous,
                                    setExcludeAmbiguous,
                                ],
                            ].map(([id, label, checked, setter]) => (
                                <label
                                    key={id}
                                    className="text-tool-checkbox cursor-target"
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => setter((value) => !value)}
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <label className="text-tool-label" htmlFor="passphrase-count">
                            Word count: {wordCount}
                        </label>
                        <input
                            id="passphrase-count"
                            className="text-tool-range"
                            type="range"
                            min={3}
                            max={8}
                            value={wordCount}
                            onChange={(event) =>
                                setWordCount(Number(event.target.value))
                            }
                        />
                        <p className="text-tool-hint" role="status">
                            Entropy: {entropy.boundariesPreserved ? "" : "at most "}
                            {entropy.bits.toFixed(1)} bits from 7,772 possible words.
                            {wordCount < 6 ? " Use six or more words for at least 77.5 bits." : " Six words provide about 77.5 bits."}
                            {!entropy.boundariesPreserved ? " Use a separator containing a number, space or punctuation, or capitalize words to preserve word boundaries." : " Fixed separators and capitalization add no random bits."}
                        </p>
                        <p className="text-tool-hint">
                            Word list adapted from <a className="cursor-target" href="https://www.eff.org/dice" target="_blank" rel="noreferrer">EFF</a> (CC BY 4.0).
                        </p>
                        <label className="text-tool-label" htmlFor="passphrase-separator">
                            Separator
                        </label>
                        <input
                            id="passphrase-separator"
                            className="text-tool-input"
                            value={separator}
                            onChange={(event) => setSeparator(event.target.value)}
                        />
                        <label className="text-tool-checkbox cursor-target">
                            <input
                                type="checkbox"
                                checked={capitalizeWords}
                                onChange={() =>
                                    setCapitalizeWords((value) => !value)
                                }
                            />
                            Capitalize words
                        </label>
                    </>
                )}
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Generated output</h2>
                    <CopyButton text={output} disabled={!result.ok} />
                </div>
                {result.error ? <p className="text-tool-empty" role="alert">{result.error}</p> : null}
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Generated password output"
                />
            </div>
        </TextToolShell>
    );
}

export default PasswordGenerator;
