export type Teeth3dStyle = 'classic' | 'homescreen';

export const TEETH_3D_STYLE: Teeth3dStyle = (() => {
  const raw = (import.meta.env.VITE_TEETH_3D_STYLE as string | undefined)?.trim().toLowerCase();
  return raw === 'homescreen' ? 'homescreen' : 'classic';
})();

export type Teeth3dMaterialPreset = {
  background: string;
  glassColor: number;
  gumColor: number;
  gumEmissive: number;
  gumEmissiveIntensity: number;
  transmission: number;
  opacity: number;
  opacityFallback: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  ior: number;
  thicknessScale: number;
  specularIntensity: number;
  /** Absorbs transmitted light so the scene BG does not tint crowns. */
  attenuationColor: number;
  attenuationDistance: number;
  sheen: number;
  sheenColor: number;
  sheenRoughness: number;
  /** Scene lighting / environment tuning. */
  envBlur: number;
  envIntensity: number;
  toneMappingExposure: number;
  hemiIntensity: number;
  keyIntensity: number;
  fillIntensity: number;
  rimIntensity: number;
  keyColor: number;
  fillColor: number;
  rimColor: number;
};

export function getTeeth3dMaterialPreset(style: Teeth3dStyle = TEETH_3D_STYLE): Teeth3dMaterialPreset {
  if (style === 'homescreen') {
    // Rubbery transparent glass: soft silicone-like blue clear plastic —
    // frosted gloss, high transmission, soft sheen (not hard acrylic / chalk).
    return {
      background: '#e3f2fb',
      glassColor: 0xa8cce4,
      gumColor: 0xd48fa0,
      gumEmissive: 0x9a4a62,
      gumEmissiveIntensity: 0.1,
      transmission: 0.82,
      opacity: 0.6,
      opacityFallback: 0.62,
      roughness: 0.38,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
      ior: 1.4,
      thicknessScale: 2.8,
      specularIntensity: 0.45,
      attenuationColor: 0xb7d7ec,
      attenuationDistance: 0.42,
      sheen: 0.55,
      sheenColor: 0xc9e4f5,
      sheenRoughness: 0.7,
      envBlur: 0.4,
      envIntensity: 0.7,
      toneMappingExposure: 1.0,
      hemiIntensity: 0.8,
      keyIntensity: 0.95,
      fillIntensity: 0.55,
      rimIntensity: 0.32,
      keyColor: 0xf0f8ff,
      fillColor: 0xb8d8ee,
      rimColor: 0x8ebcd8,
    };
  }
  return {
    background: '#e8edf5',
    glassColor: 0xf5f8ff,
    gumColor: 0xd97a89,
    gumEmissive: 0x9e3050,
    gumEmissiveIntensity: 0.22,
    transmission: 0.45,
    opacity: 1,
    opacityFallback: 0.92,
    roughness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    ior: 1.42,
    thicknessScale: 2.0,
    specularIntensity: 1,
    attenuationColor: 0xffffff,
    attenuationDistance: 1.5,
    sheen: 0,
    sheenColor: 0xffffff,
    sheenRoughness: 1,
    envBlur: 0.15,
    envIntensity: 1,
    toneMappingExposure: 1.0,
    hemiIntensity: 0.7,
    keyIntensity: 1.4,
    fillIntensity: 0.5,
    rimIntensity: 0.3,
    keyColor: 0xffffff,
    fillColor: 0xfff8ee,
    rimColor: 0xdbeafe,
  };
}
