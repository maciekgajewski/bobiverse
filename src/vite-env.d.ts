/// <reference types="vite/client" />

interface Bob034MapPerformanceSnapshot {
  camera: [number, number, number];
  target: [number, number, number];
  controlsEnabled: boolean;
  cameraTransitionActive: boolean;
  restorePending: boolean;
  framingRevision: number;
  capturedCamera: [number, number, number] | null;
  capturedTarget: [number, number, number] | null;
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
  /** Screen centre and radii (px) of one component's visible and click quads. */
  componentScreenRadii: (componentId: string) => {
    x: number;
    y: number;
    visibleRadiusPx: number;
    pickRadiusPx: number;
  };
  /** Renderer and scene-material counters for render-churn regression tests. */
  renderStats: () => {
    programs: number;
    drawCalls: number;
    materials: number;
    materialVersionSum: number;
    twoPassMaterials: number;
  };
  renderer: () => string;
}

interface Window {
  __bob034MapPerformance?: Bob034MapPerformanceBridge;
  __bobTravelRoutePresentation?: {
    legCount: number;
    pulseLayers: number;
    chevrons: number;
  };
}

declare module "troika-three-text" {
  export function configureTextBuilder(config: {
    defaultFontURL?: string | null;
    unicodeFontsURL?: string | null;
    sdfGlyphSize?: number;
    useWorker?: boolean;
  }): void;
}
