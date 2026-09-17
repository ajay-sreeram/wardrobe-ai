import { fromByteArray, toByteArray } from 'base64-js';
import jpeg from 'jpeg-js';

const maximumThumbnailEdge = 320;

export function createChatThumbnailBase64(sourceBase64: string) {
  const decoded = jpeg.decode(toByteArray(sourceBase64), { useTArray: true });
  const scale = Math.min(1, maximumThumbnailEdge / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  const pixels = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(decoded.height - 1, Math.floor(y / scale));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(decoded.width - 1, Math.floor(x / scale));
      const sourceOffset = (sourceY * decoded.width + sourceX) * 4;
      const targetOffset = (y * width + x) * 4;
      pixels[targetOffset] = decoded.data[sourceOffset];
      pixels[targetOffset + 1] = decoded.data[sourceOffset + 1];
      pixels[targetOffset + 2] = decoded.data[sourceOffset + 2];
      pixels[targetOffset + 3] = 255;
    }
  }

  const encoded = jpeg.encode({ data: pixels, width, height }, 55);
  return { base64: fromByteArray(encoded.data), width, height };
}
