import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import TextToolShell from "../_shared/TextToolShell";
import { calculatePasswordStrength } from "../_shared/webSecurityUtils";

function PasswordStrengthChecker() {
    const [password, setPassword] = useState("");

    const result = useMemo(
        () => calculatePasswordStrength(password),
        [password],
    );

    return (
        <TextToolShell title="Password Strength Checker" description="Analyze password length, character variety, and overall strength." leading={<BackButton />}>
            <div className="text-tool-panel">
                <input className="text-tool-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter a password to analyze" />
            </div>
            <div className="text-tool-panel">
                <div className="text-tool-stat-grid">
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Score</span>
                        <span className="text-tool-stat__value">{result.score}/5</span>
                    </div>
                    <div className="text-tool-stat">
                        <span className="text-tool-stat__label">Strength</span>
                        <span className="text-tool-stat__value">{result.label}</span>
                    </div>
                </div>
                <ul className="text-tool-hint" style={{ marginTop: "1rem", paddingLeft: "1.25rem" }}>
                    {result.feedback.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </div>
        </TextToolShell>
    );
}

export default PasswordStrengthChecker;
