const MAX_IMAGE_SIZE = 1000;
const MIN_IMAGE_SIZE = 500;
const RELAXATION_ITERATIONS = 200;
const RELAXATION_CONSTANT = 0.01;
const RELAXATION_OMEGA = 1.85;

interface ImageDimensions {
  readonly width: number;
  readonly height: number;
}

interface CanvasSnapshot extends ImageDimensions {
  readonly context: CanvasRenderingContext2D;
}

interface ImageMasks {
  readonly alphaValues: Float32Array;
  readonly boundaryMask: Uint8Array;
  readonly shapeMask: Uint8Array;
}

export const processMetallicPaintImage = (img: HTMLImageElement): ImageData => {
  const { context, width, height } = drawImageToCanvas(img);
  const source = context.getImageData(0, 0, width, height);
  const { alphaValues, boundaryMask, shapeMask } = createImageMasks(
    source.data,
    width,
    height,
  );
  const depthValues = solveDepthValues(shapeMask, boundaryMask, width, height);
  const maxDepth = maxValue(depthValues);

  return createDepthImage(
    context,
    width,
    height,
    alphaValues,
    depthValues,
    maxDepth,
  );
};

const drawImageToCanvas = (img: HTMLImageElement): CanvasSnapshot => {
  const { width, height } = scaledImageDimensions(img);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create a 2D canvas context.");
  }

  context.drawImage(img, 0, 0, width, height);

  return { context, height, width };
};

const scaledImageDimensions = (img: HTMLImageElement): ImageDimensions => {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const scale = imageScale(width, height);

  return {
    height: Math.round(height * scale),
    width: Math.round(width * scale),
  };
};

const imageScale = (width: number, height: number): number => {
  if (!shouldResize(width, height)) return 1;

  const dominantSize = Math.max(width, height);
  if (dominantSize > MAX_IMAGE_SIZE) return MAX_IMAGE_SIZE / dominantSize;
  if (dominantSize < MIN_IMAGE_SIZE) return MIN_IMAGE_SIZE / dominantSize;

  return 1;
};

const shouldResize = (width: number, height: number): boolean =>
  width > MAX_IMAGE_SIZE ||
  height > MAX_IMAGE_SIZE ||
  width < MIN_IMAGE_SIZE ||
  height < MIN_IMAGE_SIZE;

const createImageMasks = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
): ImageMasks => {
  const size = width * height;
  const alphaValues = new Float32Array(size);
  const shapeMask = new Uint8Array(size);
  const boundaryMask = new Uint8Array(size);

  populateShapeMask(data, alphaValues, shapeMask);
  populateBoundaryMask(shapeMask, boundaryMask, width, height);

  return { alphaValues, boundaryMask, shapeMask };
};

const populateShapeMask = (
  data: Uint8ClampedArray,
  alphaValues: Float32Array,
  shapeMask: Uint8Array,
): void => {
  for (let index = 0; index < shapeMask.length; index += 1) {
    const pixelIndex = index * 4;
    const red = data[pixelIndex] ?? 0;
    const green = data[pixelIndex + 1] ?? 0;
    const blue = data[pixelIndex + 2] ?? 0;
    const alpha = data[pixelIndex + 3] ?? 0;
    const alphaValue = isBackgroundPixel(red, green, blue, alpha)
      ? 0
      : alpha / 255;

    alphaValues[index] = alphaValue;
    shapeMask[index] = alphaValue > 0.1 ? 1 : 0;
  }
};

const isBackgroundPixel = (
  red: number,
  green: number,
  blue: number,
  alpha: number,
): boolean =>
  (red > 250 && green > 250 && blue > 250 && alpha === 255) || alpha < 5;

const populateBoundaryMask = (
  shapeMask: Uint8Array,
  boundaryMask: Uint8Array,
  width: number,
  height: number,
): void => {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!shapeMask[index]) continue;
      if (isBoundaryPixel(shapeMask, x, y, width, height)) {
        boundaryMask[index] = 1;
      }
    }
  }
};

const isBoundaryPixel = (
  shapeMask: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean => {
  if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
    return true;
  }

  const index = y * width + x;

  const hasHorizontalNeighbors = shapeMask[index - 1] && shapeMask[index + 1];
  const hasVerticalNeighbors =
    shapeMask[index - width] && shapeMask[index + width];

  return !(hasHorizontalNeighbors && hasVerticalNeighbors);
};

const solveDepthValues = (
  shapeMask: Uint8Array,
  boundaryMask: Uint8Array,
  width: number,
  height: number,
): Float32Array => {
  const depthValues = new Float32Array(width * height);

  for (let iter = 0; iter < RELAXATION_ITERATIONS; iter += 1) {
    relaxDepthValues(depthValues, shapeMask, boundaryMask, width, height);
  }

  return depthValues;
};

const relaxDepthValues = (
  depthValues: Float32Array,
  shapeMask: Uint8Array,
  boundaryMask: Uint8Array,
  width: number,
  height: number,
): void => {
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (!shapeMask[index] || boundaryMask[index]) continue;

      const newValue =
        (RELAXATION_CONSTANT +
          adjacentDepthSum(depthValues, shapeMask, index, width)) /
        4;

      depthValues[index] =
        RELAXATION_OMEGA * newValue +
        (1 - RELAXATION_OMEGA) * (depthValues[index] ?? 0);
    }
  }
};

const adjacentDepthSum = (
  depthValues: Float32Array,
  shapeMask: Uint8Array,
  index: number,
  width: number,
): number =>
  maskedDepth(depthValues, shapeMask, index + 1) +
  maskedDepth(depthValues, shapeMask, index - 1) +
  maskedDepth(depthValues, shapeMask, index + width) +
  maskedDepth(depthValues, shapeMask, index - width);

const maskedDepth = (
  depthValues: Float32Array,
  shapeMask: Uint8Array,
  index: number,
): number => (shapeMask[index] ? (depthValues[index] ?? 0) : 0);

const maxValue = (values: Float32Array): number => {
  let max = 0;

  for (const value of values) {
    if (value > max) max = value;
  }

  return max === 0 ? 1 : max;
};

const createDepthImage = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  alphaValues: Float32Array,
  depthValues: Float32Array,
  maxDepth: number,
): ImageData => {
  const output = context.createImageData(width, height);

  for (let index = 0; index < alphaValues.length; index += 1) {
    const pixelIndex = index * 4;
    const depth = (depthValues[index] ?? 0) / maxDepth;
    const gray = Math.round(255 * (1 - depth * depth));

    output.data[pixelIndex] = gray;
    output.data[pixelIndex + 1] = gray;
    output.data[pixelIndex + 2] = gray;
    output.data[pixelIndex + 3] = Math.round((alphaValues[index] ?? 0) * 255);
  }

  return output;
};
