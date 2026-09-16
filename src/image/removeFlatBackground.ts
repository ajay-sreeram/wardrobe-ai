import { fromByteArray, toByteArray } from 'base64-js';
import { decode as decodeJpeg } from 'jpeg-js';
import * as UPNG from 'upng-js';

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function median(values: number[]) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

function estimateBorderColor(data: Uint8Array, width: number, height: number, includeTransparent: boolean) {
  const red: number[] = [];
  const green: number[] = [];
  const blue: number[] = [];
  const border = Math.max(2, Math.round(Math.min(width, height) * 0.025));
  const step = Math.max(1, Math.round(Math.min(width, height) / 180));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (x >= border && x < width - border && y >= border && y < height - border) continue;
      const offset = (y * width + x) * 4;
      if (!includeTransparent && data[offset + 3] === 0) continue;
      red.push(data[offset]);
      green.push(data[offset + 1]);
      blue.push(data[offset + 2]);
    }
  }

  if (!red.length) return null;
  return [median(red), median(green), median(blue)] as const;
}

function chromaStrength(red: number, green: number, blue: number, greenScreen: boolean) {
  return greenScreen ? green - Math.max(red, blue) : Math.min(red, blue) - green;
}

function removeChromaMatte(rgba: Uint8Array, width: number, height: number, preserveExistingAlpha: boolean) {
  const background = estimateBorderColor(rgba, width, height, preserveExistingAlpha);
  if (!background) return rgba;

  const [backgroundRed, backgroundGreen, backgroundBlue] = background;
  const greenScreen = backgroundGreen > Math.max(backgroundRed, backgroundBlue);
  const backgroundChroma = Math.max(1, chromaStrength(backgroundRed, backgroundGreen, backgroundBlue, greenScreen));
  if (preserveExistingAlpha && backgroundChroma < 60) return rgba;
  let transparentPixels = 0;

  for (let offset = 0; offset < rgba.length; offset += 4) {
    const red = rgba[offset];
    const green = rgba[offset + 1];
    const blue = rgba[offset + 2];
    const existingAlpha = preserveExistingAlpha ? rgba[offset + 3] : 255;
    const redDistance = red - backgroundRed;
    const greenDistance = green - backgroundGreen;
    const blueDistance = blue - backgroundBlue;
    const distance = Math.sqrt(redDistance ** 2 + greenDistance ** 2 + blueDistance ** 2);
    const distanceAlpha = clampByte(((distance - 20) / 65) * 255);
    const pixelChroma = Math.max(0, chromaStrength(red, green, blue, greenScreen));
    const chromaAlpha = clampByte((1 - Math.min(1, pixelChroma / backgroundChroma)) * 255);
    let alpha = Math.min(existingAlpha, distanceAlpha, chromaAlpha);

    if (alpha < 12) alpha = 0;
    rgba[offset + 3] = alpha;

    if (alpha === 0) {
      rgba[offset] = 0;
      rgba[offset + 1] = 0;
      rgba[offset + 2] = 0;
      transparentPixels += 1;
      continue;
    }

    if (alpha < 255) {
      const fraction = alpha / 255;
      let cleanRed = clampByte((red - backgroundRed * (1 - fraction)) / fraction);
      let cleanGreen = clampByte((green - backgroundGreen * (1 - fraction)) / fraction);
      let cleanBlue = clampByte((blue - backgroundBlue * (1 - fraction)) / fraction);
      if (greenScreen) {
        cleanGreen = Math.min(cleanGreen, Math.max(cleanRed, cleanBlue));
      } else {
        cleanRed = Math.min(cleanRed, cleanGreen);
        cleanBlue = Math.min(cleanBlue, cleanGreen);
      }
      rgba[offset] = cleanRed;
      rgba[offset + 1] = cleanGreen;
      rgba[offset + 2] = cleanBlue;
    }
  }

  if (!preserveExistingAlpha && transparentPixels / (width * height) < 0.05) {
    throw new Error('The generated background was not uniform enough to remove safely.');
  }

  return rgba;
}

function exactArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function removeFlatBackgroundToPng(jpegBase64: string) {
  const decoded = decodeJpeg(toByteArray(jpegBase64), { useTArray: true, formatAsRGBA: true });
  const rgba = removeChromaMatte(new Uint8Array(decoded.data), decoded.width, decoded.height, false);
  const png = UPNG.encode([exactArrayBuffer(rgba)], decoded.width, decoded.height, 0);
  return fromByteArray(new Uint8Array(png));
}

export function cleanTransparentPngBase64(pngBase64: string) {
  const decoded = UPNG.decode(exactArrayBuffer(toByteArray(pngBase64)));
  const rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
  removeChromaMatte(rgba, decoded.width, decoded.height, true);
  const png = UPNG.encode([exactArrayBuffer(rgba)], decoded.width, decoded.height, 0);
  return fromByteArray(new Uint8Array(png));
}
