import type { Area, Point } from 'react-easy-crop';

export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg',
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to crop image.');
  }

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Unable to export cropped image.'));
        }
      },
      mimeType,
      0.92,
    );
  });
}

export function createImage(url: string): Promise<HTMLImageElement> {
  return loadImage(url);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Unable to load image for cropping.')));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

export async function getCroppedImageDataUrl(
  imageSrc: string,
  croppedAreaPixels: Area,
): Promise<string> {
  const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read cropped image.'));
      }
    };
    reader.onerror = () => reject(new Error('Unable to read cropped image.'));
    reader.readAsDataURL(blob);
  });
}

export type { Area, Point };
