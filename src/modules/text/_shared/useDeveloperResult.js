import { useEffect, useState } from "react";

// Parser libraries load only when requested. Never expose a previous input's output
// while its replacement is loading, and ignore promises from obsolete requests.
export default function useDeveloperResult(input, transform, option) {
    const [result, setResult] = useState(null);
    useEffect(() => {
        let active = true;
        Promise.resolve().then(() => transform(input, option)).then(
            (value) => { if (active) setResult({ input, transform, option, ok: true, value, error: "" }); },
            (error) => { if (active) setResult({ input, transform, option, ok: false, value: "", error: error instanceof Error ? error.message : String(error) }); },
        );
        return () => { active = false; };
    }, [input, transform, option]);

    if (!result || result.input !== input || result.transform !== transform || result.option !== option) {
        return { ok: false, pending: true, value: "", error: "" };
    }
    return { ...result, pending: false };
}
