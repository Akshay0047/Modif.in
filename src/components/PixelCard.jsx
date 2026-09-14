import { useEffect, useRef } from "react";
import "./PixelCard.css";

class Pixel {
    constructor(canvas, context, x, y, color, speed, delay) {
        this.width = canvas.width;
        this.height = canvas.height;
        this.ctx = context;
        this.x = x;
        this.y = y;
        this.color = color;
        this.speed = this.getRandomValue(0.1, 0.9) * speed;
        this.size = 0;
        this.sizeStep = Math.random() * 0.4;
        this.minSize = 0.5;
        this.maxSizeInteger = 2;
        this.maxSize = this.getRandomValue(this.minSize, this.maxSizeInteger);
        this.delay = delay;
        this.counter = 0;
        this.counterStep =
            Math.random() * 4 + (this.width + this.height) * 0.01;
        this.isIdle = false;
        this.isReverse = false;
        this.isShimmer = false;
    }

    getRandomValue(min, max) {
        return Math.random() * (max - min) + min;
    }

    draw() {
        const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5;
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(
            this.x + centerOffset,
            this.y + centerOffset,
            this.size,
            this.size,
        );
    }

    appear() {
        this.isIdle = false;
        if (this.counter <= this.delay) {
            this.counter += this.counterStep;
            return;
        }
        if (this.size >= this.maxSize) {
            this.isShimmer = true;
        }
        if (this.isShimmer) {
            this.shimmer();
        } else {
            this.size += this.sizeStep;
        }
        this.draw();
    }

    disappear() {
        this.isShimmer = false;
        this.counter = 0;
        if (this.size <= 0) {
            this.isIdle = true;
            return;
        }
        this.size -= 0.1;
        this.draw();
    }

    shimmer() {
        if (this.size >= this.maxSize) {
            this.isReverse = true;
        } else if (this.size <= this.minSize) {
            this.isReverse = false;
        }
        if (this.isReverse) {
            this.size -= this.speed;
        } else {
            this.size += this.speed;
        }
    }
}

function getEffectiveSpeed(value, reducedMotion) {
    const min = 0;
    const max = 100;
    const throttle = 0.001;
    const parsed = parseInt(value, 10);

    if (parsed <= min || reducedMotion) {
        return min;
    }
    if (parsed >= max) {
        return max * throttle;
    }
    return parsed * throttle;
}

const PIXEL_COLOR_PRESETS = {
    red: {
        colors: "#ffe4e4,#ff8888,#ff4444",
        glowColor: "rgba(255, 68, 68, 0.35)",
        borderHover: "rgba(255, 68, 68, 0.38)",
    },
    green: {
        colors: "#e4ffe4,#88ff88,#44ff44",
        glowColor: "rgba(68, 255, 68, 0.35)",
        borderHover: "rgba(68, 255, 68, 0.38)",
    },
    yellow: {
        colors: "#ffffe4,#ffff88,#ffff44",
        glowColor: "rgba(255, 255, 68, 0.35)",
        borderHover: "rgba(255, 255, 68, 0.38)",
    },
};

function resolvePixelColor(pixelColor) {
    if (!pixelColor) return null;

    const preset = PIXEL_COLOR_PRESETS[String(pixelColor).toLowerCase()];
    if (preset) return preset;

    return {
        colors: `${pixelColor},${pixelColor},${pixelColor}`,
        glowColor: pixelColor,
        borderHover: pixelColor,
    };
}

const VARIANTS = {
    default: {
        activeColor: null,
        gap: 5,
        speed: 35,
        colors: "#f8fafc,#f1f5f9,#cbd5e1",
        noFocus: false,
    },
    blue: {
        activeColor: "rgba(19, 0, 143, 0.35)",
        gap: 10,
        speed: 25,
        colors: "#e0f2fe,#7dd3fc,#0ea5e9",
        noFocus: false,
    },
    yellow: {
        activeColor: "#fef08a",
        gap: 3,
        speed: 20,
        colors: "#fef08a,#fde047,#eab308",
        noFocus: false,
    },
    pink: {
        activeColor: "#fecdd3",
        gap: 6,
        speed: 80,
        colors: "#fecdd3,#fda4af,#e11d48",
        noFocus: true,
    },
};

function PixelCard({
    variant = "default",
    gap,
    speed,
    colors,
    noFocus,
    className = "",
    title,
    description,
    icon,
    pixelColor,
    children,
}) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const pixelsRef = useRef([]);
    const animationRef = useRef(null);
    const timePreviousRef = useRef(0);
    const reducedMotion = useRef(
        typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ).current;

    const variantCfg = VARIANTS[variant] || VARIANTS.default;
    const colorCfg = resolvePixelColor(pixelColor);
    const finalGap = gap ?? variantCfg.gap;
    const finalSpeed = speed ?? variantCfg.speed;
    const finalColors = colors ?? colorCfg?.colors ?? variantCfg.colors;
    const finalNoFocus = noFocus ?? variantCfg.noFocus;
    const glowColor = colorCfg?.glowColor ?? variantCfg.activeColor;
    const borderHover = colorCfg?.borderHover;

    const initPixels = () => {
        if (!containerRef.current || !canvasRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        const ctx = canvasRef.current.getContext("2d");

        canvasRef.current.width = width;
        canvasRef.current.height = height;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;

        const colorsArray = finalColors.split(",");
        const pxs = [];
        for (let x = 0; x < width; x += parseInt(finalGap, 10)) {
            for (let y = 0; y < height; y += parseInt(finalGap, 10)) {
                const color =
                    colorsArray[
                        Math.floor(Math.random() * colorsArray.length)
                    ];

                const dx = x - width / 2;
                const dy = y - height / 2;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const delay = reducedMotion ? 0 : distance;

                pxs.push(
                    new Pixel(
                        canvasRef.current,
                        ctx,
                        x,
                        y,
                        color,
                        getEffectiveSpeed(finalSpeed, reducedMotion),
                        delay,
                    ),
                );
            }
        }
        pixelsRef.current = pxs;
    };

    const doAnimate = (fnName) => {
        animationRef.current = requestAnimationFrame(() => doAnimate(fnName));
        // Called only from rAF / pointer handlers, not during render.
        // eslint-disable-next-line react-hooks/purity -- ported react-bits animation loop
        const timeNow = performance.now();
        const timePassed = timeNow - timePreviousRef.current;
        const timeInterval = 1000 / 60;

        if (timePassed < timeInterval) return;
        timePreviousRef.current = timeNow - (timePassed % timeInterval);

        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx || !canvasRef.current) return;

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        let allIdle = true;
        for (let i = 0; i < pixelsRef.current.length; i++) {
            const pixel = pixelsRef.current[i];
            pixel[fnName]();
            if (!pixel.isIdle) {
                allIdle = false;
            }
        }
        if (allIdle) {
            cancelAnimationFrame(animationRef.current);
        }
    };

    const handleAnimation = (name) => {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = requestAnimationFrame(() => doAnimate(name));
    };

    const onMouseEnter = () => handleAnimation("appear");
    const onMouseLeave = () => handleAnimation("disappear");
    const onFocus = (e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        handleAnimation("appear");
    };
    const onBlur = (e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        handleAnimation("disappear");
    };

    useEffect(() => {
        timePreviousRef.current = performance.now();
        initPixels();
        const observer = new ResizeObserver(() => {
            initPixels();
        });
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => {
            observer.disconnect();
            cancelAnimationFrame(animationRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finalGap, finalSpeed, finalColors, finalNoFocus, pixelColor]);

    const cardStyle = {
        ...(glowColor
            ? {
                  "--pixel-card-active-color": glowColor,
                  "--glow-color": glowColor,
              }
            : {}),
        ...(borderHover
            ? { "--pixel-card-border-hover": borderHover }
            : {}),
    };

    return (
        <div
            ref={containerRef}
            className={`pixel-card ${className}`.trim()}
            style={Object.keys(cardStyle).length ? cardStyle : undefined}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onFocus={finalNoFocus ? undefined : onFocus}
            onBlur={finalNoFocus ? undefined : onBlur}
            tabIndex={finalNoFocus ? -1 : 0}
        >
            <canvas className="pixel-canvas" ref={canvasRef} />
            {(icon || title || description || children) && (
                <div className="pixel-card__content">
                    {icon ? (
                        <div className="pixel-card__icon-wrap">
                            <img
                                className="pixel-card__icon"
                                src={icon}
                                alt=""
                                aria-hidden="true"
                            />
                        </div>
                    ) : null}
                    {title ? (
                        <h3 className="pixel-card__title">{title}</h3>
                    ) : null}
                    {description ? (
                        <p className="pixel-card__description">
                            {description}
                        </p>
                    ) : null}
                    {children}
                </div>
            )}
        </div>
    );
}

export default PixelCard;
