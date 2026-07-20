import {
  extractToothMasksFromImageData,
  isGumColor,
} from '../colorMaskSeparation';

function setPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
) {
  const index = (y * width + x) * 4;
  data[index] = r;
  data[index + 1] = g;
  data[index + 2] = b;
  data[index + 3] = 255;
}

function fillRect(
  data: Uint8ClampedArray,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  g: number,
  b: number,
) {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      setPixel(data, width, x, y, r, g, b);
    }
  }
}

describe('isGumColor', () => {
  it('matches prompt magenta and real Gemini hot-pink gums', () => {
    expect(isGumColor(255, 0, 255)).toBe(true);
    expect(isGumColor(255, 40, 220)).toBe(true);
    expect(isGumColor(230, 20, 210)).toBe(true);
    // Sampled from the user's color mask (upper/lower gum bands).
    expect(isGumColor(221, 40, 117)).toBe(true);
    expect(isGumColor(208, 43, 119)).toBe(true);
    expect(isGumColor(206, 79, 136)).toBe(true);
    expect(isGumColor(230, 41, 114)).toBe(true);
  });

  it('rejects brown, purple, and other tooth colors', () => {
    expect(isGumColor(0, 0, 0)).toBe(false);
    expect(isGumColor(255, 255, 0)).toBe(false);
    expect(isGumColor(0, 180, 180)).toBe(false);
    // Purple / violet teeth (blue-dominant) from the mask.
    expect(isGumColor(120, 80, 255)).toBe(false);
    expect(isGumColor(128, 0, 255)).toBe(false);
    expect(isGumColor(146, 70, 185)).toBe(false);
    expect(isGumColor(154, 84, 176)).toBe(false);
    expect(isGumColor(180, 0, 255)).toBe(false);
    // Brown / orange teeth.
    expect(isGumColor(180, 120, 40)).toBe(false);
    expect(isGumColor(247, 131, 17)).toBe(false);
    expect(isGumColor(255, 140, 0)).toBe(false);
    expect(isGumColor(237, 197, 19)).toBe(false);
  });
});

describe('extractToothMasksFromImageData gum detection', () => {
  it('detects upper and lower hot-pink gum bands plus brown/purple teeth', () => {
    const width = 120;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);
    fillRect(data, width, 0, 0, width - 1, height - 1, 0, 0, 0);

    // Real-world hot-pink gums (not pure #FF00FF).
    fillRect(data, width, 10, 8, 109, 24, 221, 40, 117);
    fillRect(data, width, 12, 18, 107, 22, 208, 43, 119);
    fillRect(data, width, 10, 76, 109, 92, 206, 79, 136);
    fillRect(data, width, 14, 78, 105, 90, 230, 41, 114);

    // Upper teeth: yellow, teal, purple, orange.
    fillRect(data, width, 18, 30, 34, 48, 255, 255, 0);
    fillRect(data, width, 40, 30, 56, 48, 0, 180, 180);
    fillRect(data, width, 62, 30, 78, 48, 146, 70, 185);
    fillRect(data, width, 84, 30, 100, 48, 255, 140, 0);

    // Lower teeth: brown, yellow, teal, purple.
    fillRect(data, width, 18, 52, 34, 70, 180, 120, 40);
    fillRect(data, width, 40, 52, 56, 70, 255, 255, 0);
    fillRect(data, width, 62, 52, 78, 70, 0, 180, 180);
    fillRect(data, width, 84, 52, 100, 70, 154, 84, 176);

    const imageData = new ImageData(data, width, height);
    const result = extractToothMasksFromImageData(imageData, {
      minPixelCount: 40,
      minTeeth: 4,
    });

    const gums = result.masks.filter((mask) => mask.role === 'gum');
    expect(gums).toHaveLength(2);
    expect(gums.map((mask) => mask.id).sort()).toEqual(['GUM-L', 'GUM-U']);

    const teeth = result.masks.filter((mask) => mask.role === 'tooth');
    expect(teeth.length).toBeGreaterThanOrEqual(6);
    expect(teeth.every((mask) => !mask.id.startsWith('GUM'))).toBe(true);
    expect(
      teeth.some((mask) => mask.color.r === 180 && mask.color.g === 120 && mask.color.b === 40),
    ).toBe(true);
    expect(
      teeth.some((mask) => mask.color.r === 146 && mask.color.g === 70 && mask.color.b === 185),
    ).toBe(true);
  });

  it('keeps one gum per arch when the pink band fragments', () => {
    const width = 100;
    const height = 80;
    const data = new Uint8ClampedArray(width * height * 4);
    fillRect(data, width, 0, 0, width - 1, height - 1, 0, 0, 0);

    fillRect(data, width, 8, 6, 44, 18, 221, 40, 117);
    fillRect(data, width, 52, 6, 90, 18, 221, 40, 117);
    fillRect(data, width, 8, 62, 44, 74, 221, 40, 117);
    fillRect(data, width, 52, 62, 90, 74, 221, 40, 117);

    fillRect(data, width, 16, 28, 30, 44, 255, 255, 0);
    fillRect(data, width, 40, 28, 54, 44, 0, 180, 180);
    fillRect(data, width, 64, 28, 78, 44, 146, 70, 185);
    fillRect(data, width, 16, 46, 30, 62, 180, 120, 40);
    fillRect(data, width, 40, 46, 54, 62, 255, 255, 0);
    fillRect(data, width, 64, 46, 78, 62, 0, 180, 180);

    const imageData = new ImageData(data, width, height);
    const result = extractToothMasksFromImageData(imageData, {
      minPixelCount: 30,
      minTeeth: 4,
    });

    const gums = result.masks.filter((mask) => mask.role === 'gum');
    expect(gums).toHaveLength(2);
    expect(gums.some((mask) => mask.id === 'GUM-U')).toBe(true);
    expect(gums.some((mask) => mask.id === 'GUM-L')).toBe(true);
  });
});
