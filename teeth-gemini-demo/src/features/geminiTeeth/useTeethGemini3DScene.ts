import { useEffect, useRef } from 'react';

import { buildGeminiGlassTeethScene } from '@/pages/TeethModeling/rendering/geminiMaskTo3D';
import type { ColorMaskSeparationResult } from '@/pages/TeethModeling/utils/colorMaskSeparation';

const MODEL_SCALE = 1.85;

type Teeth3DHost = HTMLDivElement & {
  __disposeTeeth3D?: () => void;
};

type UseTeethGemini3DSceneOptions = {
  maskResult: ColorMaskSeparationResult | null;
  segmentedImageUrl: string | null;
};

export function useTeethGemini3DScene({ maskResult, segmentedImageUrl }: UseTeethGemini3DSceneOptions) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  const masksRevision = maskResult?.masks
    .map((mask) => `${mask.id}:${mask.polygon.length}:${mask.centroid.x},${mask.centroid.y}`)
    .join(';');

  useEffect(() => {
    if (!maskResult || !segmentedImageUrl) return undefined;

    const mount = hostRef.current;
    if (!mount) return undefined;

    let cancelled = false;
    let animationFrameId = 0;

    const run = async () => {
      const [THREE, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/controls/OrbitControls.js'),
        import('three/examples/jsm/environments/RoomEnvironment.js'),
      ]);
      if (cancelled) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#e8edf5');

      const TARGET_Y = -0.02;
      let orthoHeight = 0.42;
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 20);
      camera.position.set(0, 0.42, 1.5);
      camera.lookAt(0, TARGET_Y, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.toneMappingExposure = 1.0;
      mount.appendChild(renderer.domElement);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.15).texture;
      scene.environment = envTexture;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 0.3;
      controls.maxDistance = 4;
      controls.target.set(0, TARGET_Y, 0);
      controls.update();

      scene.add(new THREE.HemisphereLight(0xffffff, 0xdde4ef, 0.7));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
      keyLight.position.set(0.3, 1.0, 1.6);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xfff8ee, 0.5);
      fillLight.position.set(-1.4, 0.3, 0.8);
      scene.add(fillLight);
      const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.3);
      rimLight.position.set(0, -0.5, -1);
      scene.add(rimLight);

      const root = new THREE.Group();
      root.scale.setScalar(MODEL_SCALE);
      scene.add(root);

      buildGeminiGlassTeethScene(THREE, root, maskResult.masks, {
        imageWidth: maskResult.width,
        imageHeight: maskResult.height,
        imageData: maskResult.imageData,
      });

      // Auto-fit the ortho frustum to the built model's vertical span so that
      // aspect-correct (taller) arches are never clipped. Scales uniformly, so
      // proportions are preserved; typical crops keep the original 0.3 framing.
      const bounds = new THREE.Box3().setFromObject(root);
      if (Number.isFinite(bounds.min.y) && Number.isFinite(bounds.max.y)) {
        const spanUp = Math.abs(bounds.max.y - TARGET_Y);
        const spanDown = Math.abs(TARGET_Y - bounds.min.y);
        // 1.25× gives a comfortable margin around the arch on first load.
        const neededHalf = Math.max(spanUp, spanDown) * 1.25;
        orthoHeight = Math.max(0.42, neededHalf);
      }

      let lastWidth = 0;
      let lastHeight = 0;
      const resize = () => {
        const width = mount.clientWidth;
        const height = mount.clientHeight;
        if (!width || !height) return;
        if (width === lastWidth && height === lastHeight) return;
        lastWidth = width;
        lastHeight = height;
        const aspect = width / height;
        camera.left = -orthoHeight * aspect;
        camera.right = orthoHeight * aspect;
        camera.top = orthoHeight;
        camera.bottom = -orthoHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      const observer = new ResizeObserver(() => resize());
      observer.observe(mount);
      resize();

      const animate = () => {
        if (cancelled) return;
        controls.update();
        renderer.render(scene, camera);
        animationFrameId = window.requestAnimationFrame(animate);
      };
      animate();

      const host = mount as Teeth3DHost;
      host.__disposeTeeth3D = () => {
        observer.disconnect();
        controls.dispose();
        window.cancelAnimationFrame(animationFrameId);
        envTexture.dispose();
        pmrem.dispose();
        renderer.dispose();
        if (mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
      };
    };

    void run();

    return () => {
      cancelled = true;
      const host = mount as Teeth3DHost;
      host.__disposeTeeth3D?.();
      delete host.__disposeTeeth3D;
    };
  }, [maskResult, masksRevision, segmentedImageUrl]);

  return hostRef;
}
