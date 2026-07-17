import { getScaledDimensions } from '@/pages/DentalSimulation/simulationEngine';
import type { PreparedImageState } from '@/pages/DentalSimulation/types';

export async function blobToPreparedImage(blob: Blob): Promise<PreparedImageState> {
  const bitmap = await createImageBitmap(blob);
  try {
    const { width, height } = getScaledDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to prepare the image.');
    }

    context.drawImage(bitmap, 0, 0, width, height);
    const url = canvas.toDataURL('image/jpeg', 0.92);

    const element = new Image();
    element.src = url;
    await element.decode();

    return { element, url };
  } finally {
    bitmap.close();
  }
}

export async function loadImageFromFile(file: File): Promise<PreparedImageState> {
  return blobToPreparedImage(file);
}

export async function loadImageFromUrl(url: string): Promise<PreparedImageState> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Unable to process the captured image.');
  }
  return blobToPreparedImage(await response.blob());
}
