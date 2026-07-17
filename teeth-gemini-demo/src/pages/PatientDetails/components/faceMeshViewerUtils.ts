import type { FaceMeshPoint } from '@/types/patientDetails';
import type { MeasurementGuideKind } from '@/pages/PatientDetails/utils/measurementPointsRef';

/**
 * Creates a soft radial texture used to render landmark points as circles instead of square sprites.
 */
export function createSoftDiscTexture(THREE: typeof import('three')): import('three').CanvasTexture {
  const resolution = 64;
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('FaceMeshViewer: 2D canvas context unavailable');
  }
  const center = resolution / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.92)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.25)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, resolution, resolution);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Recenters and uniformly scales raw mesh points so the model fits a predictable viewer volume.
 */
export function normalizePoints(
  points: FaceMeshPoint[],
  THREE: typeof import('three'),
): import('three').Vector3[] {
  const vectors = points.map((point) => new THREE.Vector3(point.x, point.y, point.z));
  const bounds = new THREE.Box3();
  bounds.setFromPoints(vectors);

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  bounds.getCenter(center);
  bounds.getSize(size);

  const longestEdge = Math.max(size.x, size.y, size.z);
  const scale = longestEdge > 0 ? 1.8 / longestEdge : 1;

  return vectors.map((vector) => {
    vector.x -= center.x;
    vector.y -= center.y;
    vector.z -= center.z;
    vector.multiplyScalar(scale);
    return vector;
  });
}

/**
 * Validates that triangle indices are usable as an indexed buffer for the current vertex set.
 */
function isUsableTriangleIndexBuffer(indices: number[] | undefined, vertexCount: number): indices is number[] {
  if (!indices || indices.length < 9 || indices.length % 3 !== 0) {
    return false;
  }
  for (const i of indices) {
    if (!Number.isInteger(i) || i < 0 || i >= vertexCount) {
      return false;
    }
  }
  return true;
}

/**
 * Builds topology from ARKit triangle indices when present, otherwise falls back to a convex hull.
 */
export function buildTopologyGeometry(
  THREE: typeof import('three'),
  normalized: import('three').Vector3[],
  meshTriangleIndices: number[] | undefined,
  ConvexGeometry: typeof import('three/examples/jsm/geometries/ConvexGeometry.js').ConvexGeometry,
): import('three').BufferGeometry {
  const useArKitTopology = isUsableTriangleIndexBuffer(meshTriangleIndices, normalized.length);

  if (useArKitTopology) {
    const positions = new Float32Array(normalized.length * 3);
    for (let i = 0; i < normalized.length; i += 1) {
      const vector = normalized[i];
      positions[i * 3] = vector.x;
      positions[i * 3 + 1] = vector.y;
      positions[i * 3 + 2] = vector.z;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(meshTriangleIndices);
    geometry.computeVertexNormals();
    return geometry;
  }

  const hull = new ConvexGeometry(normalized);
  hull.computeVertexNormals();
  return hull;
}

/**
 * Maps measurement kinds to short, human-readable labels for the hover tooltip.
 */
export function measurementKindLabel(kind: MeasurementGuideKind): string {
  switch (kind) {
    case 'angle':
      return 'Angle';
    case 'xyz':
      return '3D distance';
    case 'x':
      return 'Horizontal distance';
    case 'y':
      return 'Vertical distance';
    default:
      return kind;
  }
}
