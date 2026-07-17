export type MeasurementGuideKind = 'x' | 'y' | 'angle' | 'xyz';

export type MeasurementPointReference = {
  parameter: string;
  /** Vertex indices into the face mesh vertex list (ARKit-style ordering). */
  vertices: readonly number[];
  measurement: MeasurementGuideKind;
};

export const MEASUREMENT_POINT_REFERENCES: MeasurementPointReference[] = [
  {
    parameter: 'Nasal alar width | alL-alR',
    vertices: [140, 589],//[729, 294],
    measurement: 'x',
  },
  {
    parameter: 'Nasal base width | acL-acR',
    vertices: [653, 204],
    measurement: 'x',
  },
  {
    parameter: 'Upper face height | g-sn',
    vertices: [16, 4],
    measurement: 'y',
  },
  {
    parameter: 'Vertical philtrum height | sn-st (Mm)',
    vertices: [24, 4],
    measurement: 'y',
  },
  {
    parameter: 'Facial profile angle | n-sn-pg (°)',
    vertices: [15, 4, 35],
    measurement: 'angle',
  },
  {
    parameter: 'Nasolabial angle | cm-sn-ls (°)',
    vertices: [6, 4, 21],
    measurement: 'angle',
  },
  {
    parameter: 'Nasal width angle | acL-prn-acR (°)',
    vertices: [653, 7, 204],
    measurement: 'angle',
  },
  {
    parameter: 'ZyL-GoL-975 Angle',
    vertices: [467, 484, 975],
    measurement: 'angle',
  },
  {
    parameter: 'ZyR-GoR-975 Angle',
    vertices: [888, 899, 975],
    measurement: 'angle',
  },
  {
    parameter: 'Inner eye distance | enL-enR',
    vertices: [358, 789],//[357, 1169],
    measurement: 'x',
  },
  {
    parameter: 'Facial width | zyL-zyR',
    vertices: [467, 888],
    measurement: 'x',
  },
  {
    parameter: 'Gonion width | goL-goR',
    vertices: [899, 484],
    measurement: 'x',
  },
  {
    parameter: 'Mouth width | chL-chR',
    vertices: [172, 826],
    measurement: 'x',
  },
  {
    parameter: 'Intermeatal width | meL-meR',
    vertices: [970, 980],
    measurement: 'x',
  },
  {
    parameter: 'Face height | g-pg',
    vertices: [16, 35],
    measurement: 'y',
  },
  {
    parameter: 'Lower face height | sn-pg',
    vertices: [4, 35],
    measurement: 'y',
  },
  {
    parameter: 'Nasal dorsum length | n-prn',
    vertices: [15, 7],
    measurement: 'y',
  },
  {
    parameter: 'Nasal tip protrusion | prn-sn',
    vertices: [7, 4],
    measurement: 'y',
  },
  {
    parameter: 'prn-pg',
    vertices: [7, 35],
    measurement: 'y',
  },
  {
    parameter: 'goL-pg-goR (angle)',
    vertices: [899, 35, 484],
    measurement: 'angle',
  },
  {
    parameter: 'goL-pg',
    vertices: [899, 35],
    measurement: 'xyz',
  },
  {
    parameter: 'goR-pg',
    vertices: [35, 484],
    measurement: 'xyz',
  },
  {
    parameter: 'awl',
    vertices: [4, 35],
    measurement: 'y',
  },
  {
    parameter: 'svl',
    vertices: [4, 28],
    measurement: 'y',
  },
  {
    parameter: 'gonionWidth1',
    vertices: [1006, 925],
    measurement: 'x',
  },
  {
    parameter: 'gonionWidth2',
    vertices: [1005, 926],
    measurement: 'x',
  },
  {
    parameter: 'gonionWidth3',
    vertices: [1007, 924],
    measurement: 'x',
  },
  {
    parameter: 'Palatal Height',
    vertices: [2, 6],
    measurement: 'y',
  },
  {
    parameter: 'Intermolar width',
    vertices: [678, 244],
    measurement: 'x',
  },
];

/** @deprecated Use MEASUREMENT_POINT_REFERENCES */
export const measurements = MEASUREMENT_POINT_REFERENCES;
