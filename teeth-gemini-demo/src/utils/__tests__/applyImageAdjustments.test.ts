import {
  applyBrightnessContrastLogic,
  applyUnsharpMask,
  DEFAULT_IMAGE_ADJUSTMENTS,
} from '../applyImageAdjustments';

describe('applyImageAdjustments', () => {
  it('returns unchanged pixels when adjustments are neutral', () => {
    const imageData = new ImageData(2, 1);
    imageData.data.set([128, 128, 128, 255, 128, 128, 128, 255]);

    const adjusted = applyBrightnessContrastLogic(imageData, DEFAULT_IMAGE_ADJUSTMENTS);

    expect(adjusted.data[0]).toBe(128);
    expect(adjusted.data[1]).toBe(128);
    expect(adjusted.data[2]).toBe(128);
  });

  it('brightens pixels when brightness is increased', () => {
    const imageData = new ImageData(1, 1);
    imageData.data.set([64, 64, 64, 255]);

    const adjusted = applyBrightnessContrastLogic(imageData, {
      brightness: 0.5,
      contrast: 0,
    });

    expect(adjusted.data[0]).toBeGreaterThan(64);
  });

  it('increases contrast when contrast is raised', () => {
    const imageData = new ImageData(2, 1);
    imageData.data.set([32, 32, 32, 255, 224, 224, 224, 255]);

    const adjusted = applyBrightnessContrastLogic(imageData, {
      brightness: 0,
      contrast: 50,
    });

    expect(adjusted.data[0]).toBeLessThan(32);
    expect(adjusted.data[4]).toBeGreaterThan(224);
  });

  it('sharpens pixels when sharpness is increased', () => {
    const imageData = new ImageData(3, 1);
    imageData.data.set([
      100, 100, 100, 255,
      200, 200, 200, 255,
      100, 100, 100, 255,
    ]);

    const sharpened = applyUnsharpMask(imageData, 80);
    expect(sharpened.data[4]).toBeGreaterThan(200);
  });
});
