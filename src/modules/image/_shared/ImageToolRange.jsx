import { useEffect, useId, useRef, useState } from "react";

function clampToStep(value, min, max, step) {
    let next = Math.min(max, Math.max(min, value));
    if (step && step !== 1) {
        next = Math.round(next / step) * step;
        const decimals = (String(step).split(".")[1] || "").length;
        next = Number(next.toFixed(decimals));
    } else {
        next = Math.round(next);
    }
    return Math.min(max, Math.max(min, next));
}

export default function ImageToolRange({
    id: idProp,
    label,
    min,
    max,
    step = 1,
    value,
    onChange,
    disabled = false,
    unit = "",
    formatDisplay,
    lowLabel,
    highLabel,
    centerLabel,
    classPrefix = "img-tool",
    showMeta = true,
}) {
    const autoId = useId();
    const id = idProp || autoId;
    const inputRef = useRef(null);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");

    const display = formatDisplay ? formatDisplay(value) : `${value}${unit}`;

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const commitDraft = () => {
        const parsed = Number.parseFloat(draft);
        if (!Number.isNaN(parsed)) {
            onChange(clampToStep(parsed, min, max, step));
        }
        setEditing(false);
    };

    const cancelDraft = () => {
        setEditing(false);
        setDraft("");
    };

    return (
        <div>
            {label ? (
                <label className={`${classPrefix}__label`} htmlFor={id}>
                    {label}
                </label>
            ) : null}
            <input
                id={id}
                className={`${classPrefix}__range`}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(Number(event.target.value))}
            />
            {showMeta && (lowLabel || highLabel || centerLabel || display) ? (
                <div className={`${classPrefix}__range-meta`}>
                    {lowLabel ? <span>{lowLabel}</span> : <span aria-hidden="true" />}
                    {centerLabel ? (
                        <span className={`${classPrefix}__range-value`}>{centerLabel}</span>
                    ) : editing ? (
                        <input
                            ref={inputRef}
                            className={`${classPrefix}__range-input`}
                            type="number"
                            min={min}
                            max={max}
                            step={step}
                            value={draft}
                            disabled={disabled}
                            aria-label={`${label || "Value"} manual input`}
                            onChange={(event) => setDraft(event.target.value)}
                            onBlur={commitDraft}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    commitDraft();
                                } else if (event.key === "Escape") {
                                    event.preventDefault();
                                    cancelDraft();
                                }
                            }}
                        />
                    ) : (
                        <button
                            type="button"
                            className={`${classPrefix}__range-value ${classPrefix}__range-value--editable cursor-target`}
                            disabled={disabled}
                            aria-label={`${label || "Value"}: ${display}. Click to edit.`}
                            onClick={() => {
                                setDraft(String(value));
                                setEditing(true);
                            }}
                        >
                            {display}
                        </button>
                    )}
                    {highLabel ? <span>{highLabel}</span> : <span aria-hidden="true" />}
                </div>
            ) : null}
        </div>
    );
}
