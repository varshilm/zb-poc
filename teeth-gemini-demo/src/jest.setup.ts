/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for libraries (e.g. react-router) that expect them in the test environment.
import { TextEncoder, TextDecoder } from 'util';

(globalThis as any).TextEncoder = TextEncoder;
(globalThis as any).TextDecoder = TextDecoder;

// Polyfill PointerEvent for Base UI components that rely on it.
if (typeof (globalThis as any).PointerEvent === 'undefined') {
  class PointerEvent extends Event {
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor(type: string, eventInitDict?: EventInit) {
      super(type, eventInitDict);
    }
  }
  (globalThis as any).PointerEvent = PointerEvent;
}

// Recharts ResponsiveContainer observes element size in the browser; jsdom has no ResizeObserver.
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as any).ResizeObserver = ResizeObserverMock;
}

// jsdom does not implement ImageData (used by image adjustment utilities).
if (typeof (globalThis as any).ImageData === 'undefined') {
  class ImageDataPolyfill {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;

    constructor(width: number, height: number);
    constructor(data: Uint8ClampedArray, width: number, height?: number);
    constructor(
      arg1: number | Uint8ClampedArray,
      arg2: number,
      arg3?: number,
    ) {
      if (typeof arg1 === 'number') {
        this.width = arg1;
        this.height = arg2;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = arg1;
        this.width = arg2;
        this.height = arg3 ?? Math.floor(arg1.length / (4 * arg2));
      }
    }
  }
  (globalThis as any).ImageData = ImageDataPolyfill;
}

// jsdom does not implement matchMedia (used by useMediaQuery / useIsLargeScreen).
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: (): void => {},
    removeListener: (): void => {},
    addEventListener: (): void => {},
    removeEventListener: (): void => {},
    dispatchEvent: (): boolean => false,
  }),
});

