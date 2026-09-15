import { useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import "./TargetCursor.css";

// A position: fixed element is positioned relative to the viewport UNLESS an
// ancestor establishes a containing block (transform, perspective, filter,
// will-change of those, or contain). When that happens, the cursor's translate
// no longer maps to viewport coordinates, so we measure and compensate for it.
const getContainingBlock = (element) => {
    let node = element?.parentElement;
    while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (
            style.transform !== "none" ||
            style.perspective !== "none" ||
            style.filter !== "none" ||
            style.willChange.includes("transform") ||
            style.willChange.includes("perspective") ||
            style.willChange.includes("filter") ||
            /paint|layout|strict|content/.test(style.contain)
        ) {
            return node;
        }
        node = node.parentElement;
    }
    return null;
};

const getContainingBlockOffset = (block) => {
    if (!block) return { x: 0, y: 0 };
    const rect = block.getBoundingClientRect();
    return { x: rect.left + block.clientLeft, y: rect.top + block.clientTop };
};

const TargetCursor = ({
    targetSelector = ".cursor-target",
    spinDuration = 2,
    hideDefaultCursor = true,
    hoverDuration = 0.2,
    parallaxOn = true,
    cursorColor = "#ffffff",
    cursorColorOnTarget,
}) => {
    const cursorRef = useRef(null);
    const cornersRef = useRef(null);
    const spinTl = useRef(null);
    const dotRef = useRef(null);
    const containingBlockRef = useRef(null);

    const isActiveRef = useRef(false);

    const isMobile = useMemo(() => {
        if (typeof window === "undefined") return false;
        const hasTouchScreen =
            "ontouchstart" in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        const userAgent =
            navigator.userAgent || navigator.vendor || window.opera;
        const mobileRegex =
            /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
        const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase());
        return (hasTouchScreen && isSmallScreen) || isMobileUserAgent;
    }, []);

    const constants = useMemo(
        () => ({
            borderWidth: 3,
            cornerSize: 12,
        }),
        [],
    );

    const moveCursor = useCallback((x, y) => {
        if (!cursorRef.current) return;
        const { x: offsetX, y: offsetY } = getContainingBlockOffset(
            containingBlockRef.current,
        );
        gsap.to(cursorRef.current, {
            x: x - offsetX,
            y: y - offsetY,
            duration: 0.1,
            ease: "power3.out",
        });
    }, []);

    useEffect(() => {
        if (isMobile || !cursorRef.current) return;

        const originalCursor = document.body.style.cursor;
        if (hideDefaultCursor) {
            document.body.style.cursor = "none";
            document.body.classList.add("target-cursor-active");
        }

        const cursor = cursorRef.current;
        cornersRef.current = cursor.querySelectorAll(".target-cursor-corner");

        containingBlockRef.current = getContainingBlock(cursor);
        const getOffset = () =>
            getContainingBlockOffset(containingBlockRef.current);

        let activeTarget = null;
        let currentLeaveHandler = null;
        let resumeTimeout = null;

        const cleanupTarget = (target) => {
            if (currentLeaveHandler) {
                target.removeEventListener("mouseleave", currentLeaveHandler);
            }
            currentLeaveHandler = null;
        };

        const initialOffset = getOffset();
        gsap.set(cursor, {
            xPercent: -50,
            yPercent: -50,
            x: window.innerWidth / 2 - initialOffset.x,
            y: window.innerHeight / 2 - initialOffset.y,
        });

        const createSpinTimeline = () => {
            if (spinTl.current) {
                spinTl.current.kill();
            }
            spinTl.current = gsap
                .timeline({ repeat: -1 })
                .to(cursor, {
                    rotation: "+=360",
                    duration: spinDuration,
                    ease: "none",
                });
        };

        createSpinTimeline();

        const syncCornerPositions = (target, { animate = false } = {}) => {
            if (!target || !cursorRef.current || !cornersRef.current) return;

            const rect = target.getBoundingClientRect();
            const { borderWidth, cornerSize } = constants;
            const { x: offsetX, y: offsetY } = getOffset();
            const cursorX = gsap.getProperty(cursorRef.current, "x");
            const cursorY = gsap.getProperty(cursorRef.current, "y");

            const positions = [
                {
                    x: rect.left - borderWidth - offsetX - cursorX,
                    y: rect.top - borderWidth - offsetY - cursorY,
                },
                {
                    x: rect.right + borderWidth - cornerSize - offsetX - cursorX,
                    y: rect.top - borderWidth - offsetY - cursorY,
                },
                {
                    x: rect.right + borderWidth - cornerSize - offsetX - cursorX,
                    y: rect.bottom + borderWidth - cornerSize - offsetY - cursorY,
                },
                {
                    x: rect.left - borderWidth - offsetX - cursorX,
                    y: rect.bottom + borderWidth - cornerSize - offsetY - cursorY,
                },
            ];

            const corners = Array.from(cornersRef.current);
            corners.forEach((corner, index) => {
                if (animate) {
                    gsap.to(corner, {
                        x: positions[index].x,
                        y: positions[index].y,
                        duration: hoverDuration,
                        ease: "power2.out",
                        overwrite: "auto",
                    });
                    return;
                }

                gsap.killTweensOf(corner, "x,y");
                gsap.set(corner, {
                    x: positions[index].x,
                    y: positions[index].y,
                });
            });
        };

        const resetActiveTarget = () => {
            if (!activeTarget) return;

            const target = activeTarget;
            isActiveRef.current = false;
            activeTarget = null;

            if (cursorColorOnTarget && cornersRef.current) {
                gsap.to(Array.from(cornersRef.current), {
                    borderColor: cursorColor,
                    duration: 0.15,
                    ease: "power2.out",
                });
                if (dotRef.current) {
                    gsap.to(dotRef.current, {
                        backgroundColor: cursorColor,
                        duration: 0.15,
                        ease: "power2.out",
                    });
                }
            }

            if (cornersRef.current) {
                const corners = Array.from(cornersRef.current);
                gsap.killTweensOf(corners, "x,y");
                const { cornerSize } = constants;
                const positions = [
                    { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
                    { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
                    { x: cornerSize * 0.5, y: cornerSize * 0.5 },
                    { x: -cornerSize * 1.5, y: cornerSize * 0.5 },
                ];
                const tl = gsap.timeline();
                corners.forEach((corner, index) => {
                    tl.to(
                        corner,
                        {
                            x: positions[index].x,
                            y: positions[index].y,
                            duration: 0.3,
                            ease: "power3.out",
                        },
                        0,
                    );
                });
            }

            resumeTimeout = setTimeout(() => {
                if (!activeTarget && cursorRef.current && spinTl.current) {
                    const currentRotation = gsap.getProperty(
                        cursorRef.current,
                        "rotation",
                    );
                    const normalizedRotation = currentRotation % 360;
                    spinTl.current.kill();
                    spinTl.current = gsap
                        .timeline({ repeat: -1 })
                        .to(cursorRef.current, {
                            rotation: "+=360",
                            duration: spinDuration,
                            ease: "none",
                        });
                    gsap.to(cursorRef.current, {
                        rotation: normalizedRotation + 360,
                        duration:
                            spinDuration * (1 - normalizedRotation / 360),
                        ease: "none",
                        onComplete: () => {
                            spinTl.current?.restart();
                        },
                    });
                }
                resumeTimeout = null;
            }, 50);

            cleanupTarget(target);
            currentLeaveHandler = null;
        };

        const moveHandler = (e) => {
            moveCursor(e.clientX, e.clientY);

            if (!activeTarget) return;

            if (!document.body.contains(activeTarget)) {
                resetActiveTarget();
                return;
            }

            syncCornerPositions(activeTarget);
        };
        window.addEventListener("mousemove", moveHandler);

        const scrollHandler = () => {
            if (!activeTarget || !cursorRef.current) return;
            const { x: offsetX, y: offsetY } = getOffset();
            const mouseX = gsap.getProperty(cursorRef.current, "x") + offsetX;
            const mouseY = gsap.getProperty(cursorRef.current, "y") + offsetY;
            const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
            const isStillOverTarget =
                elementUnderMouse &&
                (elementUnderMouse === activeTarget ||
                    elementUnderMouse.closest(targetSelector) === activeTarget);
            if (!isStillOverTarget) {
                resetActiveTarget();
            }
        };
        window.addEventListener("scroll", scrollHandler, { passive: true });

        const clickHandler = () => {
            requestAnimationFrame(() => {
                if (activeTarget && !document.body.contains(activeTarget)) {
                    resetActiveTarget();
                }
            });
        };
        window.addEventListener("click", clickHandler, true);

        const mutationObserver = new MutationObserver(() => {
            if (activeTarget && !document.body.contains(activeTarget)) {
                resetActiveTarget();
            }
        });
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });

        const mouseDownHandler = () => {
            if (!dotRef.current) return;
            gsap.to(dotRef.current, { scale: 0.7, duration: 0.3 });
            gsap.to(cursorRef.current, { scale: 0.9, duration: 0.2 });
        };

        const mouseUpHandler = () => {
            if (!dotRef.current) return;
            gsap.to(dotRef.current, { scale: 1, duration: 0.3 });
            gsap.to(cursorRef.current, { scale: 1, duration: 0.2 });
        };

        window.addEventListener("mousedown", mouseDownHandler);
        window.addEventListener("mouseup", mouseUpHandler);

        const enterHandler = (e) => {
            const directTarget = e.target;
            const allTargets = [];
            let current = directTarget;
            while (current && current !== document.body) {
                if (current.matches(targetSelector)) {
                    allTargets.push(current);
                }
                current = current.parentElement;
            }
            const target = allTargets[0] || null;
            if (!target || !cursorRef.current || !cornersRef.current) return;
            if (activeTarget === target) return;
            if (activeTarget) {
                cleanupTarget(activeTarget);
            }
            if (resumeTimeout) {
                clearTimeout(resumeTimeout);
                resumeTimeout = null;
            }

            activeTarget = target;
            const corners = Array.from(cornersRef.current);
            corners.forEach((corner) => gsap.killTweensOf(corner, "x,y"));

            gsap.killTweensOf(cursorRef.current, "rotation");
            spinTl.current?.pause();
            gsap.set(cursorRef.current, { rotation: 0 });

            if (cursorColorOnTarget) {
                gsap.to(corners, {
                    borderColor: cursorColorOnTarget,
                    duration: 0.15,
                    ease: "power2.out",
                });
                if (dotRef.current) {
                    gsap.to(dotRef.current, {
                        backgroundColor: cursorColorOnTarget,
                        duration: 0.15,
                        ease: "power2.out",
                    });
                }
            }

            isActiveRef.current = true;
            syncCornerPositions(target, { animate: true });

            const leaveHandler = () => {
                resetActiveTarget();
            };

            currentLeaveHandler = leaveHandler;
            target.addEventListener("mouseleave", leaveHandler);
        };

        window.addEventListener("mouseover", enterHandler, { passive: true });

        const resizeHandler = () => {
            containingBlockRef.current = getContainingBlock(cursor);
        };
        window.addEventListener("resize", resizeHandler);

        return () => {
            mutationObserver.disconnect();
            window.removeEventListener("mousemove", moveHandler);
            window.removeEventListener("mouseover", enterHandler);
            window.removeEventListener("scroll", scrollHandler);
            window.removeEventListener("click", clickHandler, true);
            window.removeEventListener("resize", resizeHandler);
            window.removeEventListener("mousedown", mouseDownHandler);
            window.removeEventListener("mouseup", mouseUpHandler);

            if (resumeTimeout) {
                clearTimeout(resumeTimeout);
            }

            if (activeTarget) {
                cleanupTarget(activeTarget);
                activeTarget = null;
            }

            spinTl.current?.kill();

            if (hideDefaultCursor) {
                document.body.style.cursor = originalCursor;
                document.body.classList.remove("target-cursor-active");
            }

            isActiveRef.current = false;
        };
    }, [
        targetSelector,
        spinDuration,
        moveCursor,
        constants,
        hideDefaultCursor,
        isMobile,
        hoverDuration,
        cursorColor,
        cursorColorOnTarget,
    ]);

    useEffect(() => {
        if (isMobile || !cursorRef.current || !spinTl.current) return;
        if (spinTl.current.isActive()) {
            spinTl.current.kill();
            spinTl.current = gsap
                .timeline({ repeat: -1 })
                .to(cursorRef.current, {
                    rotation: "+=360",
                    duration: spinDuration,
                    ease: "none",
                });
        }
    }, [spinDuration, isMobile]);

    if (isMobile || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div ref={cursorRef} className="target-cursor-wrapper">
            <div
                ref={dotRef}
                className="target-cursor-dot"
                style={{ backgroundColor: cursorColor }}
            />
            <div
                className="target-cursor-corner corner-tl"
                style={{ borderColor: cursorColor }}
            />
            <div
                className="target-cursor-corner corner-tr"
                style={{ borderColor: cursorColor }}
            />
            <div
                className="target-cursor-corner corner-br"
                style={{ borderColor: cursorColor }}
            />
            <div
                className="target-cursor-corner corner-bl"
                style={{ borderColor: cursorColor }}
            />
        </div>,
        document.body,
    );
};

export default TargetCursor;
