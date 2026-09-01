export function computeHashFromCanvas(canvas: HTMLCanvasElement) {
  const size = 8;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = size;
  tempCanvas.height = size;

  const ctx = tempCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas not supported.");
  }

  ctx.drawImage(canvas, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const pixels: number[] = [];
  let sum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    pixels.push(gray);
    sum += gray;
  }

  const avg = sum / pixels.length;
  let bits = "";
  for (const value of pixels) {
    bits += value >= avg ? "1" : "0";
  }

  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    const chunk = bits.slice(i, i + 4);
    hex += parseInt(chunk, 2).toString(16);
  }

  return hex;
}

export function hammingDistance(a: string, b: string) {
  if (a.length !== b.length) {
    return Number.POSITIVE_INFINITY;
  }
  let distance = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) distance += 1;
  }
  return distance;
}

export function computeImageQuality(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return 0;
  }
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (width === 0 || height === 0) return 0;

  let sum = 0;
  const grays: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grays.push(gray);
    sum += gray;
  }
  const mean = sum / grays.length;
  let varianceSum = 0;
  for (const value of grays) {
    varianceSum += (value - mean) ** 2;
  }
  const variance = varianceSum / grays.length;
  return Math.sqrt(variance);
}
