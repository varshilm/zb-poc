import { DEFAULT_MOUTH_PENTAGON } from '../../constants/demoConfig';
import { scalePolygonFromCenter, translatePolygon } from '../polygonCrop';

describe('polygonCrop', () => {
  it('scales polygon from its center', () => {
    const points = DEFAULT_MOUTH_PENTAGON.map((point) => ({ ...point }));
    const scaled = scalePolygonFromCenter(points, 1.2);
    const centerBefore = {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
    const centerAfter = {
      x: scaled.reduce((sum, point) => sum + point.x, 0) / scaled.length,
      y: scaled.reduce((sum, point) => sum + point.y, 0) / scaled.length,
    };

    expect(centerAfter.x).toBeCloseTo(centerBefore.x, 2);
    expect(centerAfter.y).toBeCloseTo(centerBefore.y, 2);
    expect(scaled[1].y).toBeLessThan(points[1].y);
  });

  it('translates polygon within bounds', () => {
    const points = DEFAULT_MOUTH_PENTAGON.map((point) => ({ ...point }));
    const translated = translatePolygon(points, 0.05, 0.05);

    translated.forEach((point) => {
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeLessThanOrEqual(1);
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeGreaterThanOrEqual(0);
    });
  });
});
