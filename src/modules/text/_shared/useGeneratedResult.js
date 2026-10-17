import { useState } from "react";

function generateResult(generate, settings) {
    try {
        return { ok: true, value: generate(...settings), error: "" };
    } catch (error) {
        return { ok: false, value: "", error: error instanceof Error ? error.message : String(error) };
    }
}

// `generate` is a module-level function; settings list every input to it.
// Keep randomness in state so unrelated renders cannot silently change output.
export default function useGeneratedResult(generate, settings) {
    const [stored, setStored] = useState(() => ({
        settings,
        result: generateResult(generate, settings),
    }));
    let current = stored;
    if (stored.settings.length !== settings.length || settings.some((value, index) => !Object.is(value, stored.settings[index]))) {
        current = { settings, result: generateResult(generate, settings) };
        setStored(current);
    }

    const regenerate = () => setStored({ settings, result: generateResult(generate, settings) });
    return { ...current.result, regenerate };
}
