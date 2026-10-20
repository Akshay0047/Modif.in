import { useRef, useEffect, useSyncExternalStore } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";
import { useAnimationSettings } from "../contexts/AnimationContext";
import "./Silk.css";

const hexToNormalizedRGB = (hex) => {
    const normalized = hex.replace("#", "");
    return [
        parseInt(normalized.slice(0, 2), 16) / 255,
        parseInt(normalized.slice(2, 4), 16) / 255,
        parseInt(normalized.slice(4, 6), 16) / 255,
    ];
};

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vPosition = vec3(position, 0.0);
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;
varying vec2 vUv;
varying vec3 vPosition;

uniform float uTime;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;
uniform float uLightMode;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2  r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2  rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  float rnd        = noise(gl_FragCoord.xy);
  vec2  uv         = rotateUvs(vUv * uScale, uRotation);
  vec2  tex        = uv * uScale;
  float tOffset    = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
                  0.4 * sin(5.0 * (tex.x + tex.y +
                                   cos(3.0 * tex.x + 5.0 * tex.y) +
                                   0.02 * tOffset) +
                           sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  float grain = rnd / 15.0 * uNoiseIntensity;
  vec3 waveColor = mix(uColor1, uColor2, clamp(pattern, 0.0, 1.0));
  vec3 result = waveColor * pattern - vec3(grain);
if (uLightMode > 0.5) {
  float fold = smoothstep(0.28, 0.9, pattern);
  float specular = smoothstep(0.72, 0.98, pattern);
  vec3 shadowColor = waveColor * 0.72;
  vec3 bodyColor = min(waveColor * 1.18, vec3(1.0));
  vec3 lightBase = mix(shadowColor, bodyColor, fold);
  lightBase = mix(lightBase, vec3(1.0), specular * 0.92);
  float fineNoise = noise(gl_FragCoord.xy * 0.63 + vec2(17.0, 41.0));
  float grainSignal = (rnd + fineNoise - 1.0);
  float grainStrength = clamp(uNoiseIntensity * 0.038, 0.0, 0.16);
  result = lightBase + grainSignal * grainStrength;
}
  gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}
`;

function syncUniforms(uniforms, props) {
    uniforms.uSpeed.value = props.speed;
    uniforms.uScale.value = props.scale;
    uniforms.uNoiseIntensity.value = props.noiseIntensity;
    uniforms.uColor1.value.set(hexToNormalizedRGB(props.color1));
    uniforms.uColor2.value.set(hexToNormalizedRGB(props.color2));
    uniforms.uRotation.value = props.rotation;
    uniforms.uLightMode.value = props.lightMode ? 1 : 0;
}

function subscribeEnvironment(listener) {
    const media = [window.matchMedia("(prefers-reduced-motion: reduce)"), window.matchMedia("(pointer: coarse)")];
    media.forEach((query) => query.addEventListener("change", listener));
    document.addEventListener("visibilitychange", listener);
    return () => {
        media.forEach((query) => query.removeEventListener("change", listener));
        document.removeEventListener("visibilitychange", listener);
    };
}

const getEnvironment = () => `${window.matchMedia("(prefers-reduced-motion: reduce)").matches},${document.hidden},${window.matchMedia("(pointer: coarse)").matches}`;

function Silk({
    speed = 5,
    scale = 1,
    color,
    color1 = "#7B7481",
    color2 = "#7B7481",
    noiseIntensity = 1.5,
    rotation = 0,
    lightMode = false,
}) {
    const containerRef = useRef(null);
    const contextRef = useRef(null);
    const { active = true, reducedMotion } = useAnimationSettings();
    const environment = useSyncExternalStore(subscribeEnvironment, getEnvironment, () => "true,false,true");
    const [reduce, hidden, coarse] = environment.split(",").map((value) => value === "true");
    const paused = !active || reducedMotion || reduce || hidden;
    const resolvedColor1 = color1 ?? color ?? "#7B7481";
    const resolvedColor2 = color2 ?? color1 ?? color ?? "#7B7481";
    const propsRef = useRef({ speed, scale, noiseIntensity, color1: resolvedColor1, color2: resolvedColor2, rotation, lightMode });
    const activeRef = useRef(!paused);

    useEffect(() => {
        propsRef.current = { speed, scale, noiseIntensity, color1: resolvedColor1, color2: resolvedColor2, rotation, lightMode };
        contextRef.current?.update(propsRef.current);
    }, [speed, scale, noiseIntensity, resolvedColor1, resolvedColor2, rotation, lightMode]);

    useEffect(() => {
        activeRef.current = !paused;
        contextRef.current?.setActive(!paused);
        contextRef.current?.resize();
    }, [paused, coarse]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;
        const getDpr = () => Math.min(window.devicePixelRatio || 1, window.matchMedia("(pointer: coarse)").matches ? 1 : 1.5);
        const uniforms = {
            uSpeed: { value: speed },
            uScale: { value: scale },
            uNoiseIntensity: { value: noiseIntensity },
            uColor1: { value: new Float32Array(hexToNormalizedRGB(resolvedColor1)) },
            uColor2: { value: new Float32Array(hexToNormalizedRGB(resolvedColor2)) },
            uRotation: { value: rotation },
            uLightMode: { value: lightMode ? 1 : 0 },
            uTime: { value: 0 },
        };
        let renderer, gl, geometry, program, mesh;
        let disposed = false, contextLost = false;
        let frame = 0, previousTime = null;
        let enabled = activeRef.current;
        let width = 0, height = 0, dpr = 0;
        const canvas = document.createElement("canvas");
        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.setAttribute("aria-hidden", "true");

        const createScene = () => {
            renderer = new Renderer({ canvas, dpr: getDpr(), alpha: false, depth: false, stencil: false, antialias: false });
            gl = renderer.gl;
            gl.clearColor(0, 0, 0, 1);
            geometry = new Triangle(gl);
            program = new Program(gl, { vertex: vertexShader, fragment: fragmentShader, uniforms, depthTest: false, depthWrite: false });
            mesh = new Mesh(gl, { geometry, program });
        };
        try { createScene(); }
        catch (error) {
            console.warn("Silk: WebGL could not be initialized.", error);
            return undefined;
        }
        container.appendChild(canvas);

        const renderOnce = () => {
            if (!disposed && !contextLost && !document.hidden && width > 0 && height > 0) renderer.render({ scene: mesh });
        };
        const loop = (now) => {
            frame = 0;
            if (!enabled || disposed || contextLost) return;
            if (previousTime !== null) uniforms.uTime.value += 0.1 * Math.min((now - previousTime) / 1000, 0.1);
            previousTime = now;
            renderOnce();
            frame = requestAnimationFrame(loop);
        };
        const updateAnimation = () => {
            if (enabled && !disposed && !contextLost) {
                if (!frame) frame = requestAnimationFrame(loop);
            } else {
                if (frame) cancelAnimationFrame(frame);
                frame = 0;
                previousTime = null;
                renderOnce();
            }
        };
        const resize = () => {
            if (disposed || contextLost) return;
            const rect = container.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;
            const nextDpr = getDpr();
            if (rect.width !== width || rect.height !== height || nextDpr !== dpr) {
                width = rect.width;
                height = rect.height;
                dpr = nextDpr;
                renderer.dpr = dpr;
                renderer.setSize(width, height);
            }
            renderOnce();
        };
        const onContextLost = (event) => {
            event.preventDefault();
            contextLost = true;
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
            previousTime = null;
        };
        const onContextRestored = () => {
            try {
                createScene();
                contextLost = false;
                width = height = dpr = 0;
                resize();
                updateAnimation();
            } catch (error) { console.warn("Silk: WebGL could not be restored.", error); }
        };
        canvas.addEventListener("webglcontextlost", onContextLost);
        canvas.addEventListener("webglcontextrestored", onContextRestored);
        const observer = new ResizeObserver(resize);
        observer.observe(container);
        contextRef.current = {
            update: (props) => { syncUniforms(uniforms, props); renderOnce(); },
            setActive: (value) => { enabled = value; updateAnimation(); },
            resize,
        };
        syncUniforms(uniforms, propsRef.current);
        resize();
        updateAnimation();
        return () => {
            disposed = true;
            contextRef.current = null;
            if (frame) cancelAnimationFrame(frame);
            observer.disconnect();
            canvas.removeEventListener("webglcontextlost", onContextLost);
            canvas.removeEventListener("webglcontextrestored", onContextRestored);
            if (!contextLost) {
                geometry.remove();
                program.remove();
                gl.getExtension("WEBGL_lose_context")?.loseContext();
            }
            canvas.remove();
        };
        // Props and motion changes update the existing renderer through refs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            ref={containerRef}
            className={`silk-container${paused ? " is-static" : ""}`}
            aria-hidden="true"
        />
    );
}

export default Silk;
