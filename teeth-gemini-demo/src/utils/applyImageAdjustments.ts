export type ImageAdjustments = {
  brightness: number;
  contrast: number;
  sharpness: number;
};

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  sharpness: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function applyBrightnessContrastLogic(
  imageData: ImageData,
  adjustments: Pick<ImageAdjustments, 'brightness' | 'contrast'>,
): ImageData {
  return applyBrightnessContrast(imageData, adjustments.brightness, adjustments.contrast);
}

function applyBrightnessContrast(
  imageData: ImageData,
  brightness: number,
  contrast: number,
): ImageData {
  const output = new ImageData(imageData.width, imageData.height);
  const brightnessOffset = brightness * 255;
  const contrastFactor = (contrast + 100) / 100;
  const intercept = 128 * (1 - contrastFactor);

  for (let index = 0; index < imageData.data.length; index += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const value = imageData.data[index + channel];
      const adjusted = value * contrastFactor + intercept + brightnessOffset;
      output.data[index + channel] = clamp(Math.round(adjusted), 0, 255);
    }
    output.data[index + 3] = imageData.data[index + 3];
  }

  return output;
}

function applyUnsharpMask(imageData: ImageData, amount: number): ImageData {
  if (amount <= 0) {
    return imageData;
  }

  const { width, height, data } = imageData;
  const blurred = boxBlur(imageData, 1);
  const output = new ImageData(width, height);
  const strength = amount / 100;

  for (let index = 0; index < data.length; index += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const original = data[index + channel];
      const blur = blurred.data[index + channel];
      const sharpened = original + (original - blur) * strength;
      output.data[index + channel] = clamp(Math.round(sharpened), 0, 255);
    }
    output.data[index + 3] = data[index + 3];
  }

  return output;
}

function boxBlur(imageData: ImageData, radius: number): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;

      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const sampleX = clamp(x + offsetX, 0, width - 1);
          const sampleY = clamp(y + offsetY, 0, height - 1);
          const index = (sampleY * width + sampleX) * 4;
          r += data[index];
          g += data[index + 1];
          b += data[index + 2];
          count += 1;
        }
      }

      const index = (y * width + x) * 4;
      output[index] = r / count;
      output[index + 1] = g / count;
      output[index + 2] = b / count;
      output[index + 3] = data[index + 3];
    }
  }

  return new ImageData(output, width, height);
}

export async function loadImageElement(source: string | Blob): Promise<HTMLImageElement> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source);
  const image = new Image();
  image.decoding = 'async';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Unable to load image.'));
    image.src = url;
  });
  if (typeof source !== 'string') {
    URL.revokeObjectURL(url);
  }
  return image;
}

export function applyImageAdjustmentsToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  adjustments: ImageAdjustments,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create canvas context.');
  }

  context.drawImage(source, 0, 0, width, height);
  let imageData = context.getImageData(0, 0, width, height);

  if (adjustments.brightness !== 0 || adjustments.contrast !== 0) {
    imageData = applyBrightnessContrastLogic(imageData, adjustments);
  }

  if (adjustments.sharpness > 0) {
    imageData = applyUnsharpMask(imageData, adjustments.sharpness);
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

export async function exportAdjustedImageFile(
  source: string | Blob,
  adjustments: ImageAdjustments,
  fileName = 'smile-adjusted.jpg',
): Promise<File> {
  const image = await loadImageElement(source);
  const canvas = applyImageAdjustmentsToCanvas(image, image.naturalWidth, image.naturalHeight, adjustments);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Unable to export adjusted image.'));
        }
      },
      'image/jpeg',
      0.92,
    );
  });

  return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
}

export { applyUnsharpMask };

export function createAdjustedPreviewUrl(
  source: string | Blob,
  adjustments: ImageAdjustments,
): Promise<string> {
  return loadImageElement(source).then((image) => {
    const canvas = applyImageAdjustmentsToCanvas(
      image,
      image.naturalWidth,
      image.naturalHeight,
      adjustments,
    );
    return canvas.toDataURL('image/jpeg', 0.92);
  });
}
