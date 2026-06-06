"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { processMetallicPaintImage } from "./image";
import {
  bindFullscreenQuad,
  createMetallicPaintProgram,
  type MetallicPaintUniforms,
} from "./webgl";

export interface MetallicPaintProps {
  imageSrc: string;
  seed?: number;
  scale?: number;
  refraction?: number;
  blur?: number;
  liquid?: number;
  speed?: number;
  brightness?: number;
  contrast?: number;
  angle?: number;
  fresnel?: number;
  lightColor?: string;
  darkColor?: string;
  patternSharpness?: number;
  waveAmplitude?: number;
  noiseScale?: number;
  chromaticSpread?: number;
  mouseAnimation?: boolean;
  distortion?: number;
  contour?: number;
  tintColor?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];

  const [, red, green, blue] = result;
  if (!(red && green && blue)) return [1, 1, 1];

  return [
    Number.parseInt(red, 16) / 255,
    Number.parseInt(green, 16) / 255,
    Number.parseInt(blue, 16) / 255,
  ];
};

export const MetallicPaint = ({
  imageSrc,
  seed = 42,
  scale = 4,
  refraction = 0.01,
  blur = 0.015,
  liquid = 0.75,
  speed = 0.3,
  brightness = 2,
  contrast = 0.5,
  angle = 0,
  fresnel = 1,
  lightColor = "#ffffff",
  darkColor = "#000000",
  patternSharpness = 1,
  waveAmplitude = 1,
  noiseScale = 0.5,
  chromaticSpread = 2,
  mouseAnimation = false,
  distortion = 1,
  contour = 0.2,
  tintColor = "#feb3ff",
}: MetallicPaintProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const uniformsRef = useRef<MetallicPaintUniforms | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const animTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const imgDataRef = useRef<ImageData | null>(null);
  const speedRef = useRef(speed);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
  const mouseAnimRef = useRef(mouseAnimation);

  const [ready, setReady] = useState(false);
  const [textureReady, setTextureReady] = useState(false);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    mouseAnimRef.current = mouseAnimation;
  }, [mouseAnimation]);

  const initGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const gl = canvas.getContext("webgl2", { antialias: true, alpha: true });
    if (!gl) return false;

    const paintProgram = createMetallicPaintProgram(gl);
    if (!paintProgram) return false;
    if (!bindFullscreenQuad(gl, paintProgram.program)) return false;

    glRef.current = gl;
    uniformsRef.current = paintProgram.uniforms;

    return true;
  }, []);

  const uploadTexture = useCallback((imgData: ImageData) => {
    const gl = glRef.current;
    const uniforms = uniformsRef.current;
    if (!(gl && uniforms)) return;

    if (textureRef.current) gl.deleteTexture(textureRef.current);

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      imgData.width,
      imgData.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      imgData.data,
    );
    gl.uniform1i(uniforms.u_tex, 0);
    gl.uniform1f(uniforms.u_imgRatio, imgData.width / imgData.height);
    gl.uniform1f(uniforms.u_ratio, 1);

    textureRef.current = texture;
    imgDataRef.current = imgData;
  }, []);

  useEffect(() => {
    if (!initGL()) return;

    const canvas = canvasRef.current;
    const gl = glRef.current;
    if (!(canvas && gl)) return;

    const side = 1000 * devicePixelRatio;
    canvas.width = side;
    canvas.height = side;
    gl.viewport(0, 0, side, side);

    setReady(true);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (textureRef.current && glRef.current) {
        glRef.current.deleteTexture(textureRef.current);
      }
    };
  }, [initGL]);

  useEffect(() => {
    if (!(ready && imageSrc)) return;

    let cancelled = false;
    setTextureReady(false);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;

      const imgData = processMetallicPaintImage(img);
      uploadTexture(imgData);
      setTextureReady(true);
    };
    img.src = imageSrc;

    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [ready, imageSrc, uploadTexture]);

  useEffect(() => {
    const gl = glRef.current;
    const uniforms = uniformsRef.current;
    if (!(gl && ready && uniforms)) return;

    gl.uniform1f(uniforms.u_seed, seed);
    gl.uniform1f(uniforms.u_scale, scale);
    gl.uniform1f(uniforms.u_refract, refraction);
    gl.uniform1f(uniforms.u_blur, blur);
    gl.uniform1f(uniforms.u_liquid, liquid);
    gl.uniform1f(uniforms.u_bright, brightness);
    gl.uniform1f(uniforms.u_contrast, contrast);
    gl.uniform1f(uniforms.u_angle, angle);
    gl.uniform1f(uniforms.u_fresnel, fresnel);

    const light = hexToRgb(lightColor);
    const dark = hexToRgb(darkColor);
    const tint = hexToRgb(tintColor);
    gl.uniform3f(uniforms.u_lightColor, light[0], light[1], light[2]);
    gl.uniform3f(uniforms.u_darkColor, dark[0], dark[1], dark[2]);
    gl.uniform1f(uniforms.u_sharp, patternSharpness);
    gl.uniform1f(uniforms.u_wave, waveAmplitude);
    gl.uniform1f(uniforms.u_noise, noiseScale);
    gl.uniform1f(uniforms.u_chroma, chromaticSpread);
    gl.uniform1f(uniforms.u_distort, distortion);
    gl.uniform1f(uniforms.u_contour, contour);
    gl.uniform3f(uniforms.u_tint, tint[0], tint[1], tint[2]);
  }, [
    ready,
    seed,
    scale,
    refraction,
    blur,
    liquid,
    brightness,
    contrast,
    angle,
    fresnel,
    lightColor,
    darkColor,
    patternSharpness,
    waveAmplitude,
    noiseScale,
    chromaticSpread,
    distortion,
    contour,
    tintColor,
  ]);

  useEffect(() => {
    if (!(ready && textureReady)) return;

    const gl = glRef.current;
    const uniforms = uniformsRef.current;
    const canvas = canvasRef.current;
    const mouse = mouseRef.current;
    if (!(gl && uniforms && canvas)) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = (event.clientX - rect.left) / rect.width;
      mouse.targetY = (event.clientY - rect.top) / rect.height;
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    const render = (time: number) => {
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (mouseAnimRef.current) {
        mouse.x += (mouse.targetX - mouse.x) * 0.08;
        mouse.y += (mouse.targetY - mouse.y) * 0.08;
        animTimeRef.current = mouse.x * 3000 + mouse.y * 1500;
      } else {
        animTimeRef.current += delta * speedRef.current;
      }

      gl.uniform1f(uniforms.u_time, animTimeRef.current);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [ready, textureReady]);

  return (
    <canvas ref={canvasRef} className="block h-full w-full object-contain" />
  );
};
