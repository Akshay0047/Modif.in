import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
    forwardRef,
    useRef,
    useState,
    useLayoutEffect,
    useEffect,
} from "react";
import { Color } from "three";
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
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vPosition = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
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

const SilkPlane = forwardRef(function SilkPlane({ uniforms }, ref) {
    const { viewport } = useThree();

    useLayoutEffect(() => {
        if (ref.current) {
            ref.current.scale.set(viewport.width, viewport.height, 1);
        }
    }, [ref, viewport]);

    useFrame((_, delta) => {
        if (ref.current?.material?.uniforms?.uTime) {
            ref.current.material.uniforms.uTime.value += 0.1 * delta;
        }
    });

    return (
        <mesh ref={ref}>
            <planeGeometry args={[1, 1, 1, 1]} />
            <shaderMaterial
                uniforms={uniforms}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
            />
        </mesh>
    );
});
SilkPlane.displayName = "SilkPlane";

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
    const meshRef = useRef();
    const resolvedColor1 = color1 ?? color ?? "#7B7481";
    const resolvedColor2 = color2 ?? color1 ?? color ?? "#7B7481";

    const [uniforms] = useState(
        () => ({
            uSpeed: { value: speed },
            uScale: { value: scale },
            uNoiseIntensity: { value: noiseIntensity },
            uColor1: { value: new Color(...hexToNormalizedRGB(resolvedColor1)) },
            uColor2: { value: new Color(...hexToNormalizedRGB(resolvedColor2)) },
            uRotation: { value: rotation },
            uLightMode: { value: lightMode ? 1 : 0 },
            uTime: { value: 0 },
        }),
    );

    useEffect(() => {
        const materialUniforms = meshRef.current?.material.uniforms;
        if (!materialUniforms) return;
        materialUniforms.uSpeed.value = speed;
        materialUniforms.uScale.value = scale;
        materialUniforms.uNoiseIntensity.value = noiseIntensity;
        materialUniforms.uColor1.value.setRGB(...hexToNormalizedRGB(resolvedColor1));
        materialUniforms.uColor2.value.setRGB(...hexToNormalizedRGB(resolvedColor2));
        materialUniforms.uRotation.value = rotation;
        materialUniforms.uLightMode.value = lightMode ? 1 : 0;
    }, [
        speed,
        scale,
        noiseIntensity,
        resolvedColor1,
        resolvedColor2,
        rotation,
        lightMode,
    ]);

    return (
        <Canvas
            className="silk-container"
            dpr={[1, 2]}
            frameloop="always"
            gl={{ antialias: true, alpha: false }}
        >
            <SilkPlane ref={meshRef} uniforms={uniforms} />
        </Canvas>
    );
}

export default Silk;
