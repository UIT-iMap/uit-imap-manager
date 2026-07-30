import type {
  TourScene,
  LinkHotspot,
  InfoHotspot,
  ViewParameters,
  TourLevel,
} from "../types";

export type { TourScene, LinkHotspot, InfoHotspot, ViewParameters, TourLevel };

export interface MarzipanoScene {
  data: TourScene;
  scene: any;
  view: any;
}
