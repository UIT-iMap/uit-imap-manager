import * as React from "react";

export interface ModelViewerElement extends HTMLElement {
  cameraOrbit: string;
  fieldOfView: string;
  cameraTarget: string;
  resetTurntableRotation(deg?: number): void;
  jumpCameraToGoal(): void;
  queryHotspot(name: string): {
    canvasPosition: { x: number; y: number };
    worldPosition: { x: number; y: number; z: number };
  } | null;
  getBoundingClientRect(): DOMRect;
}

export interface ModelViewerJSX extends React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  ModelViewerElement
> {
  src?: string;
  alt?: string;
  "camera-controls"?: boolean | "";
  ar?: boolean | "";
  "ar-modes"?: string;
  "camera-orbit"?: string;
  "field-of-view"?: string;
  "min-camera-orbit"?: string;
  "max-camera-orbit"?: string;
  "shadow-intensity"?: string;
  "tone-mapping"?: string;
  exposure?: string;
  poster?: string;
  autoplay?: boolean | "";
  "environment-image"?: string;
  "interaction-prompt"?: string;
  "touch-action"?: string;
  style?: React.CSSProperties;
  id?: string;
  ref?: React.Ref<ModelViewerElement>;
}

// React 19: intrinsic elements được TS tra cứu qua React.JSX, không phải global JSX nữa.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerJSX;
    }
  }
}

// Giữ thêm global JSX namespace để tương thích ngược / các tooling khác (vd. một số linter, storybook...)
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerJSX;
    }
  }
}
