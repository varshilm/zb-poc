import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { createSoftDiscTexture, normalizePoints } from '@/pages/PatientDetails/components/faceMeshViewerUtils';
import { FACE_MESH_TRIANGULATION } from '@/pages/DentalSimulation/faceTriangulation';
import type { FaceMeshPoint } from '@/types/patientDetails';

import type { NormalizedLandmark } from '../utils/jawMeasurements';

type FaceMesh3DViewProps = {
  landmarks: NormalizedLandmark[];
  imageWidth: number;
  imageHeight: number;
  className?: string;
  /** CSS aspect-ratio for the viewport. Default landscape; use '3 / 4' for portrait. */
  aspectRatio?: string;
};

const PALETTE = {
  sceneBackground: '#f8f8f8',
  fill: '#e5f3ff',
  points: '#2563eb',
  guides: '#0d9488',
  iris: '#22d3ee',
  wireframe: '#93c5fd',
};

const MEASUREMENT_CHORDS: [number, number][] = [
  [172, 397],
  [61, 291],
  [234, 454],
  [152, 1],
];

function toRawMeshPoints(
  landmarks: NormalizedLandmark[],
  imageWidth: number,
  imageHeight: number,
): FaceMeshPoint[] {
  const aspectX = imageWidth / Math.max(imageWidth, imageHeight);
  const aspectY = imageHeight / Math.max(imageWidth, imageHeight);
  return landmarks.map((lm) => ({
    x: (lm.x - 0.5) * 2 * aspectX,
    y: -(lm.y - 0.5) * 2 * aspectY,
    z: -lm.z * 2,
  }));
}

function buildFilledMesh(
  THREE_NS: typeof THREE,
  normalized: THREE.Vector3[],
  landmarkCount: number,
): THREE.Mesh {
  const positions = new Float32Array(landmarkCount * 3);
  for (let i = 0; i < landmarkCount; i++) {
    positions[i * 3] = normalized[i].x;
    positions[i * 3 + 1] = normalized[i].y;
    positions[i * 3 + 2] = normalized[i].z;
  }

  const validIndices: number[] = [];
  for (let i = 0; i < FACE_MESH_TRIANGULATION.length; i += 3) {
    const a = FACE_MESH_TRIANGULATION[i];
    const b = FACE_MESH_TRIANGULATION[i + 1];
    const c = FACE_MESH_TRIANGULATION[i + 2];
    if (a < landmarkCount && b < landmarkCount && c < landmarkCount) {
      validIndices.push(a, b, c);
    }
  }

  const geometry = new THREE_NS.BufferGeometry();
  geometry.setAttribute('position', new THREE_NS.BufferAttribute(positions, 3));
  geometry.setIndex(validIndices);
  geometry.computeVertexNormals();

  const fillColor = new THREE_NS.Color(PALETTE.fill);
  const material = new THREE_NS.MeshStandardMaterial({
    color: new THREE_NS.Color(0x000000),
    emissive: fillColor,
    emissiveIntensity: 1,
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0,
    flatShading: false,
    side: THREE_NS.DoubleSide,
    transparent: true,
    opacity: 0.92,
  });

  return new THREE_NS.Mesh(geometry, material);
}

function buildWireframeOverlay(
  THREE_NS: typeof THREE,
  mesh: THREE.Mesh,
): THREE.LineSegments {
  const edges = new THREE_NS.EdgesGeometry(mesh.geometry, 12);
  const material = new THREE_NS.LineBasicMaterial({
    color: PALETTE.wireframe,
    transparent: true,
    opacity: 0.35,
    depthTest: true,
  });
  const lines = new THREE_NS.LineSegments(edges, material);
  lines.renderOrder = 1;
  return lines;
}

function buildPointCloud(
  THREE_NS: typeof THREE,
  normalized: THREE.Vector3[],
  discTexture: THREE.CanvasTexture,
): THREE.Points {
  const geometry = new THREE_NS.BufferGeometry();
  geometry.setFromPoints(normalized.slice(0, 468));
  const material = new THREE_NS.PointsMaterial({
    map: discTexture,
    color: PALETTE.points,
    size: 0.042,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: true,
    alphaTest: 0.01,
  });
  const points = new THREE_NS.Points(geometry, material);
  points.renderOrder = 2;
  return points;
}

function buildMeasurementGuides(
  THREE_NS: typeof THREE,
  normalized: THREE.Vector3[],
  n: number,
): THREE.Group {
  const group = new THREE_NS.Group();
  const guideRadius = 0.008;
  const yAxis = new THREE_NS.Vector3(0, 1, 0);
  const material = new THREE_NS.MeshBasicMaterial({
    color: PALETTE.guides,
    transparent: true,
    opacity: 1,
    depthTest: false,
    depthWrite: false,
  });

  for (const [from, to] of MEASUREMENT_CHORDS) {
    if (from >= n || to >= n) continue;
    const start = normalized[from];
    const end = normalized[to];
    const direction = end.clone().sub(start);
    const length = direction.length();
    if (length <= Number.EPSILON) continue;

    const geometry = new THREE_NS.CylinderGeometry(guideRadius, guideRadius, length, 10);
    const segment = new THREE_NS.Mesh(geometry, material);
    segment.position.copy(start).add(end).multiplyScalar(0.5);
    segment.quaternion.setFromUnitVectors(yAxis, direction.normalize());
    segment.renderOrder = 3;
    group.add(segment);
  }

  group.renderOrder = 3;
  return group;
}

function buildEndpointDots(
  THREE_NS: typeof THREE,
  normalized: THREE.Vector3[],
  n: number,
  discTexture: THREE.CanvasTexture,
): THREE.Points {
  const positions: number[] = [];
  for (const [from, to] of MEASUREMENT_CHORDS) {
    if (from >= n || to >= n) continue;
    const a = normalized[from];
    const b = normalized[to];
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const geometry = new THREE_NS.BufferGeometry();
  geometry.setAttribute('position', new THREE_NS.Float32BufferAttribute(positions, 3));
  const material = new THREE_NS.PointsMaterial({
    map: discTexture,
    color: PALETTE.guides,
    size: 0.07,
    transparent: true,
    opacity: 1,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: true,
    alphaTest: 0.01,
  });
  const points = new THREE_NS.Points(geometry, material);
  points.renderOrder = 4;
  return points;
}

function buildIrisRing(
  THREE_NS: typeof THREE,
  normalized: THREE.Vector3[],
  indices: number[],
): THREE.LineLoop {
  const positions = indices.map((idx) => normalized[idx]);
  const geometry = new THREE_NS.BufferGeometry();
  geometry.setFromPoints(positions);
  const material = new THREE_NS.LineBasicMaterial({
    color: PALETTE.iris,
    depthTest: false,
  });
  const ring = new THREE_NS.LineLoop(geometry, material);
  ring.renderOrder = 3;
  return ring;
}

function disposeObject3D(obj: THREE.Object3D | null, discTexture?: THREE.CanvasTexture) {
  if (!obj) return;
  if ('geometry' in obj && obj.geometry) {
    (obj.geometry as THREE.BufferGeometry).dispose();
  }
  const mat = 'material' in obj ? (obj as THREE.Mesh).material : undefined;
  if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
  else mat?.dispose();
  discTexture?.dispose();
}

export function FaceMesh3DView({
  landmarks,
  imageWidth,
  imageHeight,
  className,
  aspectRatio = '4 / 3',
}: FaceMesh3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || landmarks.length === 0) return;

    const w = container.clientWidth;
    const h = container.clientHeight || w;
    const n = landmarks.length;

    const rawPoints = toRawMeshPoints(landmarks, imageWidth, imageHeight);
    const normalized = normalizePoints(rawPoints, THREE);
    const discTexture = createSoftDiscTexture(THREE);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PALETTE.sceneBackground);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100);
    camera.position.set(-1.0, 0, 2.65);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 0.9;
    controls.maxDistance = 5;
    controls.target.set(0, 0, 0);
    controls.update();

    const root = new THREE.Group();
    scene.add(root);

    const filledMesh = buildFilledMesh(THREE, normalized, n);
    const wireframe = buildWireframeOverlay(THREE, filledMesh);
    const pointCloud = buildPointCloud(THREE, normalized, discTexture);
    const guideLines = buildMeasurementGuides(THREE, normalized, n);
    const endpointDots = buildEndpointDots(THREE, normalized, n, discTexture);
    const irisRings: THREE.LineLoop[] = [];

    root.add(filledMesh);
    root.add(wireframe);
    root.add(pointCloud);
    root.add(guideLines);
    root.add(endpointDots);

    if (n >= 478) {
      irisRings.push(
        buildIrisRing(THREE, normalized, [469, 470, 471, 472]),
        buildIrisRing(THREE, normalized, [474, 475, 476, 477]),
      );
      irisRings.forEach((ring) => root.add(ring));
    }

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    let lastW = w;
    let lastH = h;
    const observer = new ResizeObserver(() => {
      const rw = container.clientWidth;
      const rh = container.clientHeight || rw;
      if (rw === lastW && rh === lastH) return;
      lastW = rw;
      lastH = rh;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      controls.dispose();

      wireframe.geometry.dispose();
      (wireframe.material as THREE.Material).dispose();
      disposeObject3D(filledMesh);
      disposeObject3D(pointCloud);
      guideLines.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
      const guideMaterial = guideLines.children[0] instanceof THREE.Mesh
        ? (guideLines.children[0].material as THREE.Material)
        : null;
      guideMaterial?.dispose();
      disposeObject3D(endpointDots);
      irisRings.forEach((ring) => disposeObject3D(ring));
      discTexture.dispose();

      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [landmarks, imageWidth, imageHeight]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        aspectRatio,
        background: PALETTE.sceneBackground,
        borderRadius: 'inherit',
      }}
    />
  );
}
