import { fromByteArray, toByteArray } from 'base64-js';
import { decode as decodeJpeg } from 'jpeg-js';
import * as UPNG from 'upng-js';

function median(values: number[]) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

function estimateBorderColor(data: Uint8Array, width: number, height: number) {
  const red: number[] = [];
  const green: number[] = [];
  const blue: number[] = [];
  const border = Math.max(2, Math.round(Math.min(width, height) * 0.025));
  const step = Math.max(1, Math.round(Math.min(width, height) / 180));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (x >= border && x < width - border && y >= border && y < height - border) continue;
      const offset = (y * width + x) * 4;
      red.push(data[offset]);
      green.push(data[offset + 1]);
      blue.push(data[offset + 2]);
    }
  }

  return [median(red), median(green), median(blue)] as const;
}

export function removeFlatBackgroundToPng(jpegBase64: string) {
  const decoded = decodeJpeg(toByteArray(jpegBase64), { useTArray: true, formatAsRGBA: true });
  const rgba = new Uint8Array(decoded.data);
  const [backgroundRed, backgroundGreen, backgroundBlue] = estimateBorderColor(rgba, decoded.width, decoded.height);
  let transparentPixels = 0;

  for (let offset = 0; offset < rgba.length; offset += 4) {
    const redDistance = rgba[offset] - backgroundRed;
    const greenDistance = rgba[offset + 1] - backgroundGreen;
    const blueDistance = rgba[offset + 2] - backgroundBlue;
    const distance = Math.sqrt(redDistance ** 2 + greenDistance ** 2 + blueDistance ** 2);
    const alpha = Math.max(0, Math.min(255, Math.round(((distance - 20) / 65) * 255)));
    rgba[offset + 3] = alpha;
    if (alpha === 0) transparentPixels += 1;
  }

  if (transparentPixels / (decoded.width * decoded.height) < 0.05) {
    throw new Error('The generated background was not uniform enough to remove safely.');
  }

  const png = UPNG.encode([rgba.buffer as ArrayBuffer], decoded.width, decoded.height, 0);
  return fromByteArray(new Uint8Array(png));
}
