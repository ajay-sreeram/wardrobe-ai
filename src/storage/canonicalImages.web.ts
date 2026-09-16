export function saveGeneratedGarmentPreview(base64: string) {
  return `data:image/png;base64,${base64}`;
}

export async function persistCanonicalGarmentImage(previewUri: string) {
  return previewUri;
}

export async function cleanCanonicalGarmentImages() {}
