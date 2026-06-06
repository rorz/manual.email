import { fragmentShader, vertexShader } from "./shaders";

const metallicPaintUniformNames = [
  "u_tex",
  "u_time",
  "u_ratio",
  "u_imgRatio",
  "u_seed",
  "u_scale",
  "u_refract",
  "u_blur",
  "u_liquid",
  "u_bright",
  "u_contrast",
  "u_angle",
  "u_fresnel",
  "u_sharp",
  "u_wave",
  "u_noise",
  "u_chroma",
  "u_distort",
  "u_contour",
  "u_lightColor",
  "u_darkColor",
  "u_tint",
] as const;

type MetallicPaintUniformName = (typeof metallicPaintUniformNames)[number];

export type MetallicPaintUniforms = Record<
  MetallicPaintUniformName,
  WebGLUniformLocation | null
>;

interface MetallicPaintProgram {
  readonly program: WebGLProgram;
  readonly uniforms: MetallicPaintUniforms;
}

export const createMetallicPaintProgram = (
  gl: WebGL2RenderingContext,
): MetallicPaintProgram | null => {
  const vertex = compileShader(gl, vertexShader, gl.VERTEX_SHADER);
  const fragment = compileShader(gl, fragmentShader, gl.FRAGMENT_SHADER);
  if (!(vertex && fragment)) return null;

  const program = linkProgram(gl, vertex, fragment);
  if (!program) return null;

  return {
    program,
    uniforms: collectUniforms(gl, program),
  };
};

export const bindFullscreenQuad = (
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
): boolean => {
  const verts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const buffer = gl.createBuffer();
  if (!buffer) return false;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

  gl.useProgram(program);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  return true;
};

const compileShader = (
  gl: WebGL2RenderingContext,
  source: string,
  type: number,
): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
};

const linkProgram = (
  gl: WebGL2RenderingContext,
  vertex: WebGLShader,
  fragment: WebGLShader,
): WebGLProgram | null => {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
};

const collectUniforms = (
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
): MetallicPaintUniforms => {
  const uniforms = {} as MetallicPaintUniforms;

  for (const name of metallicPaintUniformNames) {
    uniforms[name] = gl.getUniformLocation(program, name);
  }

  return uniforms;
};
