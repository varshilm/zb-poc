import type { MouthRoiRect, ToothBorder2D, ToothInstance2D } from '@/pages/TeethModeling/types';

import { isTeethMlConfigured, TEETH_RECON_API_URL } from '@/api/teethConfig';

export type TeethReconstructRequest = {
  imageBase64: string;
  mouthRoi: MouthRoiRect;
  borders: ToothBorder2D[];
  arch2D: {
    upper: ToothInstance2D[];
    lower: ToothInstance2D[];
  };
};

export type TeethReconstructResponse = {
  upperMeshGlbBase64: string;
  lowerMeshGlbBase64: string;
  camera: {
    fov: number;
    position: [number, number, number];
  };
  projectionOverlayBase64: string;
  quality: {
    fitError: number;
    warnings: string[];
    viewCount?: number;
  };
  /** Arch curve derived from occlusal view — only present in multi-view responses. */
  occlusalArch?: {
    archWidth: number;
    archDepth: number;
    centerX: number;
    centerY: number;
  } | null;
};

export type TeethMultiViewReconstructRequest = {
  views: Array<{
    role: string;
    imageBase64: string;
    mouthRoi?: MouthRoiRect;
    arch2D?: {
      upper: ToothInstance2D[];
      lower: ToothInstance2D[];
    };
  }>;
};

export type TeethReconstructClient = {
  reconstruct: (request: TeethReconstructRequest) => Promise<TeethReconstructResponse>;
  reconstructMulti: (request: TeethMultiViewReconstructRequest) => Promise<TeethReconstructResponse>;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${TEETH_RECON_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Teeth reconstruct request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

const httpTeethReconstructClient: TeethReconstructClient = {
  reconstruct(request) {
    return postJson<TeethReconstructResponse>('/teeth/reconstruct', {
      imageBase64: request.imageBase64,
      mouthRoi: request.mouthRoi,
      borders: request.borders.map((border) => ({
        id: border.toothId,
        arch: border.arch,
        polygon: border.polygon,
        confidence: border.confidence,
      })),
      arch2D: request.arch2D,
    });
  },
  reconstructMulti(request) {
    return postJson<TeethReconstructResponse>('/teeth/reconstruct/multi', request);
  },
};

const stubTeethReconstructClient: TeethReconstructClient = {
  async reconstruct() {
    throw new Error('Teeth reconstruction service is not configured.');
  },
  async reconstructMulti() {
    throw new Error('Teeth reconstruction service is not configured.');
  },
};

export const teethReconstructClient: TeethReconstructClient = isTeethMlConfigured()
  ? httpTeethReconstructClient
  : stubTeethReconstructClient;

export function glbBase64ToObjectUrl(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'model/gltf-binary' });
  return URL.createObjectURL(blob);
}

export function pngBase64ToDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`;
}

export function normalizeReconstructResponse(
  raw: Partial<TeethReconstructResponse> | null | undefined,
): TeethReconstructResponse | null {
  if (!raw?.upperMeshGlbBase64 || !raw?.lowerMeshGlbBase64) {
    return null;
  }

  const cameraPosition = raw.camera?.position;
  const hasValidCamera =
    Array.isArray(cameraPosition) &&
    cameraPosition.length === 3 &&
    cameraPosition.every((value) => typeof value === 'number' && Number.isFinite(value));

  return {
    upperMeshGlbBase64: raw.upperMeshGlbBase64,
    lowerMeshGlbBase64: raw.lowerMeshGlbBase64,
    camera: hasValidCamera
      ? { fov: raw.camera?.fov ?? 42, position: cameraPosition as [number, number, number] }
      : { fov: 42, position: [0, 0.12, 1.35] },
    projectionOverlayBase64: raw.projectionOverlayBase64 ?? '',
    quality: {
      fitError: raw.quality?.fitError ?? 0,
      warnings: Array.isArray(raw.quality?.warnings) ? raw.quality.warnings : [],
    },
  };
}

export function isValidReconstruction(
  reconstruction: TeethReconstructResponse | null | undefined,
): reconstruction is TeethReconstructResponse {
  return normalizeReconstructResponse(reconstruction) !== null;
}
