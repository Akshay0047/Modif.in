import { useEffect, useRef, useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { useAnimationSettings } from "../contexts/AnimationContext";
import "./TargetCursor.css";

const cursorQuery = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const subscribeCursorSupport = (listener) => {
    const media = window.matchMedia(cursorQuery);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
};
const getCursorSupport = () => window.matchMedia(cursorQuery).matches;

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
    spinDuration = 6.4,
    hideDefaultCursor = true,
    hoverDuration = 0.2,
    cursorColor = "#ffffff",
    cursorColorOnTarget,
}) => {
    const { active = true, reducedMotion } = useAnimationSettings();
    const supported = useSyncExternalStore(subscribeCursorSupport, getCursorSupport, () => false);
    const enabled = active && supported && !reducedMotion;
    const cursorRef = useRef(null);
    const cornersRef = useRef(null);
    const spinTl = useRef(null);
    const dotRef = useRef(null);
    const containingBlockRef = useRef(null);

    const isActiveRef = useRef(false);

    const constants = useMemo(
        () => ({
            borderWidth: 2,
            cornerSize: 8,
        }),
        [],
    );

    useEffect(() => {
        if (!enabled || !cursorRef.current) return;

        const originalCursor = document.body.style.cursor;
        if (hideDefaultCursor) {
            document.body.style.cursor = "none";
            document.body.classList.add("target-cursor-active");
        }

        const cursor = cursorRef.current;
        const dot = dotRef.current;
        cornersRef.current = cursor.querySelectorAll(".target-cursor-corner");

        containingBlockRef.current = getContainingBlock(cursor);
        const getOffset = () =>
            getContainingBlockOffset(containingBlockRef.current);

        let activeTarget = null;
        let currentLeaveHandler = null;
        let resumeTimeout = null;
        let clickFrame = 0;
        let moveFrame = 0;
        let scrollFrame = 0;
        let targetLockTween = null;
        let lastPointer = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        };

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

        // Reuse four tweens instead of creating overlapping x/y tweens for
        // every high-frequency mouse event.
        const motionOptions = { duration: 0.1, ease: "power3.out" };
        const cursorXTo = gsap.quickTo(cursor, "x", motionOptions);
        const cursorYTo = gsap.quickTo(cursor, "y", motionOptions);
        const dotXTo = gsap.quickTo(dot, "x", motionOptions);
        const dotYTo = gsap.quickTo(dot, "y", motionOptions);
        const pauseCursorMove = () => { cursorXTo.tween.pause(); cursorYTo.tween.pause(); };
        const pauseDotMove = () => { dotXTo.tween.pause(); dotYTo.tween.pause(); };

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

        const syncCornerPositions = (
            target,
            { animate = false, useTargetCenter = false, rect: targetRect, offset: targetOffset } = {},
        ) => {
            if (!target || !cursorRef.current || !cornersRef.current) return;

            const rect = targetRect ?? target.getBoundingClientRect();
            const { borderWidth, cornerSize } = constants;
            const { x: offsetX, y: offsetY } = targetOffset ?? getOffset();
            const cursorX = useTargetCenter
                ? rect.left + rect.width / 2 - offsetX
                : gsap.getProperty(cursorRef.current, "x");
            const cursorY = useTargetCenter
                ? rect.top + rect.height / 2 - offsetY
                : gsap.getProperty(cursorRef.current, "y");

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

        const lockCursorToTarget = (target, { animate = false, rect: targetRect, offset: targetOffset } = {}) => {
            if (!target || !cursorRef.current) return;

            const rect = targetRect ?? target.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const { x: offsetX, y: offsetY } = targetOffset ?? getOffset();
            const lockProps = {
                x: centerX - offsetX,
                y: centerY - offsetY,
                width: rect.width,
                height: rect.height,
            };

            pauseCursorMove();
            targetLockTween?.kill();
            targetLockTween = null;

            if (animate) {
                targetLockTween = gsap.to(cursorRef.current, {
                    ...lockProps,
                    duration: hoverDuration,
                    ease: "power2.out",
                });
                return;
            }

            gsap.set(cursorRef.current, lockProps);
        };

        const moveCursorTo = (x, y, { animate = true } = {}) => {
            if (!cursorRef.current) return;
            const { x: offsetX, y: offsetY } = getOffset();
            const props = {
                x: x - offsetX,
                y: y - offsetY,
            };

            if (animate) {
                cursorXTo(props.x, gsap.getProperty(cursorRef.current, "x"));
                cursorYTo(props.y, gsap.getProperty(cursorRef.current, "y"));
                return;
            }

            pauseCursorMove();
            gsap.set(cursorRef.current, props);
        };

        const moveDotTo = (x, y, { animate = true, offset } = {}) => {
            if (!dotRef.current || !cursorRef.current) return;

            const { x: offsetX, y: offsetY } = offset ?? getOffset();
            const cursorX = gsap.getProperty(cursorRef.current, "x");
            const cursorY = gsap.getProperty(cursorRef.current, "y");
            const props = {
                x: x - offsetX - cursorX,
                y: y - offsetY - cursorY,
            };

            if (animate) {
                dotXTo(props.x, gsap.getProperty(dotRef.current, "x"));
                dotYTo(props.y, gsap.getProperty(dotRef.current, "y"));
                return;
            }

            pauseDotMove();
            gsap.set(dotRef.current, props);
        };

        const resetDotPosition = () => {
            if (!dotRef.current) return;
            pauseDotMove();
            gsap.set(dotRef.current, { x: 0, y: 0 });
        };

        const resetActiveTarget = () => {
            if (!activeTarget) return;

            const target = activeTarget;
            isActiveRef.current = false;
            activeTarget = null;

            targetLockTween?.kill();
            targetLockTween = null;
            pauseCursorMove();
            gsap.set(cursorRef.current, { width: 0, height: 0 });
            resetDotPosition();
            moveCursorTo(lastPointer.x, lastPointer.y, { animate: false });

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
                    // One timeline owns rotation throughout hover and resume.
                    spinTl.current.restart();
                }
                resumeTimeout = null;
            }, 50);

            cleanupTarget(target);
            currentLeaveHandler = null;
        };

        const updatePointer = () => {
            moveFrame = 0;
            if (activeTarget) {
                if (!document.body.contains(activeTarget)) {
                    resetActiveTarget();
                    return;
                }

                moveDotTo(lastPointer.x, lastPointer.y);
                return;
            }

            moveCursorTo(lastPointer.x, lastPointer.y);
        };
        const moveHandler = (event) => {
            lastPointer.x = event.clientX;
            lastPointer.y = event.clientY;
            if (!moveFrame) moveFrame = requestAnimationFrame(updatePointer);
        };
        window.addEventListener("mousemove", moveHandler, { passive: true });

        const updateScroll = () => {
            scrollFrame = 0;
            if (!activeTarget || !cursorRef.current) return;

            if (!document.body.contains(activeTarget)) {
                resetActiveTarget();
                return;
            }

            // Read geometry and hit-test before writes can invalidate layout.
            const rect = activeTarget.getBoundingClientRect();
            const offset = getOffset();
            const elementUnderMouse = document.elementFromPoint(
                lastPointer.x,
                lastPointer.y,
            );
            const isStillOverTarget =
                elementUnderMouse &&
                (elementUnderMouse === activeTarget ||
                    elementUnderMouse.closest(targetSelector) === activeTarget);
            if (!isStillOverTarget) {
                resetActiveTarget();
                return;
            }
            lockCursorToTarget(activeTarget, { rect, offset });
            syncCornerPositions(activeTarget, { useTargetCenter: true, rect, offset });
            moveDotTo(lastPointer.x, lastPointer.y, { animate: false, offset });
        };
        const scrollHandler = () => {
            if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
        };
        window.addEventListener("scroll", scrollHandler, { passive: true });

        const clickHandler = () => {
            cancelAnimationFrame(clickFrame);
            clickFrame = requestAnimationFrame(() => {
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
            const target = e.target.closest?.(targetSelector);
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
            const rect = target.getBoundingClientRect();
            const offset = getOffset();
            const corners = Array.from(cornersRef.current);
            corners.forEach((corner) => gsap.killTweensOf(corner, "x,y"));

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
            lockCursorToTarget(target, { animate: true, rect, offset });
            syncCornerPositions(target, {
                animate: true,
                useTargetCenter: true,
                rect,
                offset,
            });
            moveDotTo(lastPointer.x, lastPointer.y, { animate: false });

            const leaveHandler = () => {
                resetActiveTarget();
            };

            currentLeaveHandler = leaveHandler;
            target.addEventListener("mouseleave", leaveHandler);
        };

        window.addEventListener("mouseover", enterHandler, { passive: true });

        const resizeHandler = () => {
            containingBlockRef.current = getContainingBlock(cursor);
            if (activeTarget && document.body.contains(activeTarget)) {
                const rect = activeTarget.getBoundingClientRect();
                const offset = getOffset();
                lockCursorToTarget(activeTarget, { rect, offset });
                syncCornerPositions(activeTarget, { useTargetCenter: true, rect, offset });
                moveDotTo(lastPointer.x, lastPointer.y, { animate: false, offset });
            }
        };
        window.addEventListener("resize", resizeHandler);

        return () => {
            cancelAnimationFrame(clickFrame);
            cancelAnimationFrame(moveFrame);
            cancelAnimationFrame(scrollFrame);
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
            spinTl.current = null;
            targetLockTween?.kill();
            [cursorXTo, cursorYTo, dotXTo, dotYTo].forEach((move) => move.tween.kill());
            gsap.killTweensOf([cursor, ...cornersRef.current, dot].filter(Boolean));

            if (hideDefaultCursor) {
                document.body.style.cursor = originalCursor;
                document.body.classList.remove("target-cursor-active");
            }

            isActiveRef.current = false;
        };
    }, [
        targetSelector,
        spinDuration,
        constants,
        hideDefaultCursor,
        enabled,
        hoverDuration,
        cursorColor,
        cursorColorOnTarget,
    ]);

    if (!enabled || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div ref={cursorRef} className="target-cursor-wrapper" aria-hidden="true">
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
