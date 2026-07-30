/// <reference types="vite/client" />

interface Bob034MapPerformanceSnapshot {
  camera: [number, number, number];
  target: [number, number, number];
}

interface Bob034MapPerformanceBridge {
  snapshot: () => Bob034MapPerformanceSnapshot;
  screenPoint: (systemId: string) => { x: number; y: number };
  fixture: {
    systemIds: string[];
    componentIds: string[];
    knownSystemIds: string[];
    activeSystemIds: string[];
  };
  renderer: () => string;
}

interface Window {
  __bob034MapPerformance?: Bob034MapPerformanceBridge;
}
