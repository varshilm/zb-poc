import type { ColorToothMask, RgbColor } from '../utils/colorMaskSeparation';

type ThreeModule = typeof import('three');
type Group = import('three').Group;
type Texture = import('three').Texture;

export type GeminiGlassSceneOptions = {
  imageWidth: number;
  imageHeight: number;
  /** Raw mask pixels — used to build pixel-accurate tooth textures. */
  imageData: ImageData;
  /** Z curve so posterior teeth sit further back — forms the dental arch. */
  archDepth?: number;
  /** How much each tooth yaws to follow the arch tangent (radians at the edge). */
  yawStrength?: number;
  /** How far each tooth bulges toward the camera (crown roundness). */
  domeStrength?: number;
  /** Color match tolerance when isolating a tooth from the mask crop. */
  colorTolerance?: number;
  /** <1 pulls tooth centers toward the midline to tighten horizontal gaps. */
  toothSpacing?: number;
  /** Slightly widens each crown to close gaps that yaw would otherwise open. */
  toothWidthScale?: number;
};

const WORLD_WIDTH = 1.0;
const PLANE_SEGMENTS = 32;

/**
 * Vertical world scale that preserves the mask's true pixel aspect ratio.
 *
 * X maps 1 image pixel to `WORLD_WIDTH / imageWidth` world units. To keep the
 * 3D crowns the same height:width ratio as the 2D color mask, Y must map a pixel
 * to the SAME world distance, which requires the scale to equal
 * `imageHeight / imageWidth`. A previously hard-coded 0.42 only matched ~2.4:1
 * crops and vertically squashed every other aspect ratio.
 */
function heightScaleFor(imageWidth: number, imageHeight: number): number {
  return Math.max(imageHeight, 1) / Math.max(imageWidth, 1);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function toWorldX(imageX: number, imageWidth: number): number {
  return ((imageX / Math.max(imageWidth, 1)) * 2 - 1) * WORLD_WIDTH * 0.5;
}

function toWorldY(imageY: number, imageHeight: number, heightScale: number): number {
  return (0.5 - imageY / Math.max(imageHeight, 1)) * WORLD_WIDTH * heightScale;
}

/** Circular dental-arch profile: anterior teeth forward, molars curve back in a C. */
function archZ(imageX: number, imageWidth: number, archDepth: number): number {
  const normX = Math.min(1, Math.max(-1, (imageX / Math.max(imageWidth, 1)) * 2 - 1));
  return -(1 - Math.sqrt(1 - normX * normX)) * archDepth;
}

/** Same circular arch curve but from an absolute world X (range ≈ [-0.5, 0.5]). */
function archZFromWorldX(worldX: number, archDepth: number): number {
  const normX = Math.min(1, Math.max(-1, worldX / (WORLD_WIDTH * 0.5)));
  return -(1 - Math.sqrt(1 - normX * normX)) * archDepth;
}

function colorDistanceSq(a: RgbColor, r: number, g: number, b: number): number {
  const dr = a.r - r;
  const dg = a.g - g;
  const db = a.b - b;
  return dr * dr + dg * dg + db * db;
}

type ToothCrop = {
  /** Grayscale alpha mask (white inside, black outside) for the tooth silhouette. */
  alphaTexture: Texture;
  /** 1 = inside tooth, 0 = outside, indexed [y * cropWidth + x]. */
  insideMask: Uint8Array;
  cropWidth: number;
  cropHeight: number;
  cropMinX: number;
  cropMinY: number;
};

type BuildCropOptions = {
  /** Extend the crop + grow the mask this many px toward the teeth (for gums). */
  extendTowardTeethPx?: number;
  /** Arch determines which direction "toward the teeth" is. */
  arch?: 'upper' | 'lower';
};

/** Grow the mask toward the teeth so a gum band sits over the crown tops. */
function dilateTowardTeeth(
  insideMask: Uint8Array,
  cropWidth: number,
  cropHeight: number,
  arch: 'upper' | 'lower',
  px: number,
): Uint8Array {
  if (px <= 0) return insideMask;
  const out = new Uint8Array(insideMask);
  const dir = arch === 'upper' ? 1 : -1; // upper gum grows downward toward teeth
  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      if (!insideMask[y * cropWidth + x]) continue;
      for (let k = 1; k <= px; k += 1) {
        const ny = y + dir * k;
        if (ny >= 0 && ny < cropHeight) out[ny * cropWidth + x] = 1;
      }
    }
  }
  return out;
}

/** Crop a single tooth/gum silhouette from the mask as a grayscale alpha stencil. */
function buildToothCrop(
  THREE: ThreeModule,
  mask: ColorToothMask,
  imageData: ImageData,
  toleranceSq: number,
  options: BuildCropOptions = {},
): ToothCrop {
  const pad = 2;
  const extend = Math.max(0, Math.round(options.extendTowardTeethPx ?? 0));
  const extendDown = options.arch === 'upper' ? extend : 0;
  const extendUp = options.arch === 'lower' ? extend : 0;

  const minX = Math.max(0, Math.floor(mask.bounds.minX) - pad);
  const minY = Math.max(0, Math.floor(mask.bounds.minY) - pad - extendUp);
  const maxX = Math.min(imageData.width - 1, Math.ceil(mask.bounds.maxX) + pad);
  const maxY = Math.min(imageData.height - 1, Math.ceil(mask.bounds.maxY) + pad + extendDown);
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;

  let insideMask: Uint8Array = new Uint8Array(cropWidth * cropHeight);
  const { data, width } = imageData;

  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      const srcIndex = ((minY + y) * width + (minX + x)) * 4;
      const r = data[srcIndex] ?? 0;
      const g = data[srcIndex + 1] ?? 0;
      const b = data[srcIndex + 2] ?? 0;
      if (colorDistanceSq(mask.color, r, g, b) <= toleranceSq) {
        insideMask[y * cropWidth + x] = 1;
      }
    }
  }

  if (extend > 0 && options.arch) {
    insideMask = dilateTowardTeeth(insideMask, cropWidth, cropHeight, options.arch, extend);
  }

  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext('2d')!;
  const stencil = ctx.createImageData(cropWidth, cropHeight);
  for (let i = 0; i < insideMask.length; i += 1) {
    const value = insideMask[i] ? 255 : 0;
    stencil.data[i * 4] = value;
    stencil.data[i * 4 + 1] = value;
    stencil.data[i * 4 + 2] = value;
    stencil.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(stencil, 0, 0);

  const alphaTexture = new THREE.CanvasTexture(canvas);
  alphaTexture.needsUpdate = true;
  return { alphaTexture, insideMask, cropWidth, cropHeight, cropMinX: minX, cropMinY: minY };
}

/** Bright warm-white enamel — reads cleanly on the light background. */
const GLASS_WHITE = 0xf5f8ff;
/** Realistic gingiva pink for gum regions. */
const GUM_PINK = 0xd97a89;
const GUM_EMISSIVE = 0x9e3050;

/** Small floating number label for a tooth (dark text with a light halo). */
function buildLabelSprite(THREE: ThreeModule, label: string): import('three').Sprite {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  ctx.font = `bold ${label.length > 2 ? 48 : 58}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeText(label, size / 2, size / 2);
  ctx.fillStyle = 'rgba(30,41,59,0.95)';
  ctx.fillText(label, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  return new THREE.Sprite(material);
}

/** Distance (in cells) from a cell to the nearest outside cell — used for a natural dome. */
function computeEdgeDistance(insideMask: Uint8Array, cropWidth: number, cropHeight: number): Float32Array {
  const dist = new Float32Array(cropWidth * cropHeight);
  const INF = 1e6;
  for (let i = 0; i < dist.length; i += 1) dist[i] = insideMask[i] ? INF : 0;

  // Two-pass chamfer distance transform
  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      const i = y * cropWidth + x;
      if (!insideMask[i]) continue;
      let best = dist[i]!;
      if (x > 0) best = Math.min(best, dist[i - 1]! + 1);
      if (y > 0) best = Math.min(best, dist[i - cropWidth]! + 1);
      if (x > 0 && y > 0) best = Math.min(best, dist[i - cropWidth - 1]! + 1.414);
      if (x < cropWidth - 1 && y > 0) best = Math.min(best, dist[i - cropWidth + 1]! + 1.414);
      dist[i] = best;
    }
  }
  for (let y = cropHeight - 1; y >= 0; y -= 1) {
    for (let x = cropWidth - 1; x >= 0; x -= 1) {
      const i = y * cropWidth + x;
      if (!insideMask[i]) continue;
      let best = dist[i]!;
      if (x < cropWidth - 1) best = Math.min(best, dist[i + 1]! + 1);
      if (y < cropHeight - 1) best = Math.min(best, dist[i + cropWidth]! + 1);
      if (x < cropWidth - 1 && y < cropHeight - 1) best = Math.min(best, dist[i + cropWidth + 1]! + 1.414);
      if (x > 0 && y < cropHeight - 1) best = Math.min(best, dist[i + cropWidth - 1]! + 1.414);
      dist[i] = best;
    }
  }
  return dist;
}

function sampleGrid(
  values: Float32Array | Uint8Array,
  cropWidth: number,
  cropHeight: number,
  u: number,
  v: number,
): number {
  // Plane uv (0,0)=bottom-left, (1,1)=top-right. Image row 0 = top → flip v.
  const px = Math.min(cropWidth - 1, Math.max(0, Math.round(u * (cropWidth - 1))));
  const py = Math.min(cropHeight - 1, Math.max(0, Math.round((1 - v) * (cropHeight - 1))));
  return values[py * cropWidth + px] ?? 0;
}

/**
 * Build a 3D scene where each tooth is a rounded, lit crown whose silhouette and
 * color match the 2D mask exactly. The front view replicates the mask; orbiting
 * reveals the bulging crown shape and gaps between teeth.
 */
export function buildGeminiGlassTeethScene(
  THREE: ThreeModule,
  root: Group,
  masks: ColorToothMask[],
  options: GeminiGlassSceneOptions,
): void {
  root.clear();

  const {
    imageWidth,
    imageHeight,
    imageData,
    archDepth = 0.34,
    yawStrength = 0.8,
    domeStrength = 0.6,
    colorTolerance = 60,
    toothSpacing = 1,
    toothWidthScale = 1,
  } = options;
  const toleranceSq = colorTolerance * colorTolerance;
  const heightScale = heightScaleFor(imageWidth, imageHeight);

  masks.forEach((mask) => {
    const isGum = mask.role === 'gum';
    const isUpper = mask.arch === 'upper';

    // Gently broaden gums over the crown tops (kept modest to avoid large sheets).
    const gumExtendPx = isGum ? Math.round(mask.bounds.height * 0.25) : 0;
    const crop = buildToothCrop(THREE, mask, imageData, toleranceSq, {
      extendTowardTeethPx: gumExtendPx,
      arch: mask.arch,
    });
    const { alphaTexture, insideMask, cropWidth, cropHeight, cropMinX, cropMinY } = crop;

    const worldW = (cropWidth / Math.max(imageWidth, 1)) * WORLD_WIDTH;
    const worldH = (cropHeight / Math.max(imageHeight, 1)) * WORLD_WIDTH * heightScale;

    const centerX = cropMinX + cropWidth * 0.5;
    const centerY = cropMinY + cropHeight * 0.5;
    const wx = toWorldX(centerX, imageWidth);
    const wy = toWorldY(centerY, imageHeight, heightScale);
    const wz = archZ(mask.centroid.x, imageWidth, archDepth);

    const edgeDistance = computeEdgeDistance(insideMask, cropWidth, cropHeight);
    let maxDistance = 0;
    for (let i = 0; i < edgeDistance.length; i += 1) {
      if (edgeDistance[i]! > maxDistance) maxDistance = edgeDistance[i]!;
    }
    maxDistance = Math.max(maxDistance, 1);

    // Teeth are rounded crowns; the gum is a smooth pink band that follows the arch.
    const crownDepth = Math.min(worldW, worldH) * domeStrength;
    const gumDepth = Math.min(0.05, Math.max(0.028, worldH * 0.28));
    const depth = isGum ? gumDepth : crownDepth;
    // Gum uses the SAME arch depth as the teeth so it curves back identically at the sides.
    // A shallower arch was the root cause of the gum floating in front of posterior teeth.

    // Yaw angle for this tooth (used to compensate its projected width).
    const normXCentroid = Math.min(1, Math.max(-1, (mask.centroid.x / Math.max(imageWidth, 1)) * 2 - 1));
    const yawAngle = isGum ? 0 : Math.asin(normXCentroid) * yawStrength;

    // Finer tessellation for the wide gum band so it stays smooth (no faceting).
    const segX = isGum ? 140 : PLANE_SEGMENTS;
    const segY = isGum ? 26 : PLANE_SEGMENTS;
    // Compensate ONLY the yaw-induced projected narrowing (1/cos θ), so each crown's
    // on-screen width matches its true 2D width. Real gaps (e.g. a diastema) are
    // preserved because tooth centers are NOT moved.
    const yawComp = isGum ? 1 : Math.min(1.6, 1 / Math.cos(yawAngle));
    const geomW = isGum ? worldW : worldW * yawComp * toothWidthScale;
    const geometry = new THREE.PlaneGeometry(geomW, worldH, segX, segY);
    const position = geometry.attributes.position as import('three').BufferAttribute;
    const uv = geometry.attributes.uv as import('three').BufferAttribute;

    for (let i = 0; i < position.count; i += 1) {
      const u = uv.getX(i);
      const v = uv.getY(i); // 0 = bottom, 1 = top

      if (isGum) {
        // Build ONE continuous curved surface for the whole band (inside AND outside
        // vertices), so edge triangles never stretch into shards. The alphaMap then
        // cleanly cuts the silhouette on top of this smooth surface.
        // Using archDepth (same as teeth) keeps the sides curving back in sync with
        // the posterior crowns — preventing the gum from appearing on top of them.
        const worldX = wx + position.getX(i);
        const curve = archZFromWorldX(worldX, archDepth);
        let z = curve;
        if (sampleGrid(insideMask, cropWidth, cropHeight, u, v)) {
          const dGum = sampleGrid(edgeDistance, cropWidth, cropHeight, u, v) / maxDistance;
          const roundedGum = Math.sqrt(Math.max(0, dGum));
          const rootward = isUpper ? v : 1 - v;
          const ridge = 0.55 + 0.45 * smoothstep(0, 1, rootward);
          // Cap the forward bulge so the gum surface stays behind the tooth crowns
          // at every position along the arch (sides included).
          z += roundedGum * depth * ridge * 0.45;
        }
        position.setZ(i, z);
        continue;
      }

      const inside = sampleGrid(insideMask, cropWidth, cropHeight, u, v);
      if (!inside) {
        position.setZ(i, 0);
        continue;
      }

      // Radial roundedness from the silhouette edge (0 at rim → 1 at core)
      const d = sampleGrid(edgeDistance, cropWidth, cropHeight, u, v) / maxDistance;
      const rounded = Math.sqrt(Math.max(0, d));

      // Vertical taper: full body near the gum line, thin at the incisal edge.
      const gumward = isUpper ? v : 1 - v;
      const verticalProfile = 0.32 + 0.68 * smoothstep(0, 1, gumward);
      // Slight cervical bulge (labial convexity) just below the gum line
      const cervical = 1 + 0.18 * Math.exp(-Math.pow((gumward - 0.78) / 0.16, 2));

      position.setZ(i, rounded * depth * verticalProfile * cervical);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();

    type PhysicalCtor = new (p: object) => import('three').Material;
    const Physical = (THREE as unknown as { MeshPhysicalMaterial?: PhysicalCtor })
      .MeshPhysicalMaterial;

    let material: import('three').Material;
    if (isGum) {
      // Soft matte pink gingiva
      material = new THREE.MeshStandardMaterial({
        color: GUM_PINK,
        alphaMap: alphaTexture,
        transparent: true,
        alphaTest: 0.5,
        roughness: 0.65,
        metalness: 0,
        emissive: GUM_EMISSIVE,
        emissiveIntensity: 0.22,
        side: THREE.DoubleSide,
      });
    } else if (Physical) {
      // Clear-aligner enamel: slightly translucent white that reads bright on a
      // light background. Lower transmission keeps the crown body clearly visible.
      material = new Physical({
        color: GLASS_WHITE,
        alphaMap: alphaTexture,
        transparent: true,
        alphaTest: 0.5,
        opacity: 1.0,
        roughness: 0.1,
        metalness: 0,
        transmission: 0.45,
        thickness: crownDepth * 2.0,
        ior: 1.42,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        side: THREE.DoubleSide,
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        color: GLASS_WHITE,
        alphaMap: alphaTexture,
        transparent: true,
        alphaTest: 0.5,
        opacity: 0.92,
        roughness: 0.12,
        metalness: 0,
        side: THREE.DoubleSide,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);

    if (isGum) {
      // The gum is a continuous curved band (bent along the arch per-vertex, no yaw).
      // A small fixed inset keeps the gum consistently behind the tooth back faces at
      // every arch position. Using a depth-relative offset caused the inset to be
      // insufficient at the sides where the arch difference was the true problem.
      mesh.position.set(wx, wy, -0.008);
      mesh.rotation.x = isUpper ? -0.04 : 0.04;
      mesh.renderOrder = 0;
    } else {
      // Keep each tooth at its true center (real gaps preserved); yaw follows the arch
      // tangent while the width compensation above cancels the projected narrowing.
      mesh.position.set(wx * toothSpacing, wy, wz);
      mesh.rotation.y = yawAngle;
      // Gentle pitch so the arch reads as a curved smile, not a flat billboard row.
      mesh.rotation.x = isUpper ? -0.06 : 0.06;
      mesh.renderOrder = 1;
    }
    root.add(mesh);

    // Small tooth number floating just in front of the crown (teeth only)
    if (!isGum) {
      const sprite = buildLabelSprite(THREE, mask.id);
      const labelScale = Math.min(0.03, Math.max(worldW * 0.2, 0.014));
      sprite.scale.set(labelScale, labelScale, 1);
      sprite.position.set(wx * toothSpacing, wy, wz + crownDepth + 0.02);
      root.add(sprite);
    }
  });
}
