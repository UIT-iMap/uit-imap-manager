// ==================== Core domain types ====================

export type DataId =
  | "hotspots"
  | "rooms"
  | "edges"
  | "tourScenes"
  | "tourspots"
  | "transport";

export type TabId = DataId | "model" | "floorPreview";

export interface User {
  name: string;
}

export type Edge = {
  first: string;
  second: string;
};

export type Category =
  | "classroom"
  | "computer_room"
  | "hall"
  | "lab"
  | "library"
  | "office"
  | "stairs"
  | "warehouse"
  | "wc"
  | "tech";

export const CATEGORY_COLORS: Record<Category, string> = {
  classroom: "bg-blue-100 text-blue-700",
  computer_room: "bg-teal-100 text-teal-700",
  hall: "bg-amber-100 text-amber-700",
  lab: "bg-purple-100 text-purple-700",
  library: "bg-green-100 text-green-700",
  office: "bg-indigo-100 text-indigo-700",
  stairs: "bg-slate-200 text-slate-700",
  warehouse: "bg-stone-200 text-stone-700",
  wc: "bg-rose-100 text-rose-700",
  tech: "bg-orange-100 text-orange-700",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  classroom: "Phòng học",
  computer_room: "Phòng máy",
  hall: "Hội trường",
  lab: "Phòng thí nghiệm",
  library: "Thư viện",
  office: "Văn phòng",
  stairs: "Cầu thang",
  warehouse: "Kho",
  wc: "Nhà vệ sinh",
  tech: "Phòng kỹ thuật",
};

export const CATEGORY_VALUES: Category[] = Object.keys(
  CATEGORY_COLORS,
) as Category[];

export interface Hotspot {
  id: string;
  showInDefault?: boolean;
  name?: string;
  description?: string;
  dataPosition: [number, number, number];
  dataNormal: [number, number, number];
}

export interface Room {
  id: number;
  name: string;
  floor?: number;
  belongsTo: string; // Hotspot.id
  category: Category;
  description?: string;
  rows?: [number, number];
  cols?: [number, number];
  hasEvent?: boolean;
}

export interface TourLevel {
  tileSize: number;
  size: number;
  fallbackOnly?: boolean;
}

export interface ViewParameters {
  yaw: number;
  pitch: number;
  fov: number;
}

export interface LinkHotspot {
  yaw: number;
  pitch: number;
  rotation: number;
  target: string; // TourScene.id
}

export interface InfoHotspot {
  yaw: number;
  pitch: number;
  title: string;
  text: string;
}

export interface TourScene {
  id: string;
  name: string;
  levels: TourLevel[];
  faceSize: number;
  initialViewParameters: ViewParameters;
  linkHotspots: LinkHotspot[];
  infoHotspots: InfoHotspot[];
}

export interface MarzipanoScene {
  data: TourScene;
  scene: any;
  view: any;
}


export interface Tourspot {
  id: string;
  sceneId: string; // TourScene.id
  dataPosition: [number, number, number];
  dataNormal: [number, number, number];
}

export interface Transport {
  spot: "cA" | "cB";
  name: string;
  type: "bus" | "metro";
  providers: string[];
}
export type AnyRow = Hotspot | Room | Edge | TourScene | Tourspot | Transport;

// ==================== Table rule configuration ====================

export type FieldType = "text" | "arr";

export interface TableRule {
  name: string;
  isShow?: boolean; // default true
  label?: string;
  isMandatory?: boolean; // default true
  allowSort?: boolean; // default true
  editable?: boolean; // default true
  type?: FieldType;
  fixedSize?: number; // fixed number of elements, if type is 'arr'
  values?: string[]; // list of allowed data values
}

// ==================== Data context slice ====================

export interface DataSlice<T = any> {
  id: DataId;
  fetchUrl: string;
  data: T[];
  loading: boolean;
  error: string | null;
  tableRules: TableRule[];
  rowIdKey: string; // which field acts as the row's primary key
  fetch: () => Promise<void>;
  save: (token?: string | null) => Promise<void>;
  removeRow?: (rowIdx: number) => void;
  addRow?: (row: T) => void;
  editRow?: (attribute: string, rowIdx: number, newValue: any) => void;
  editRowFields?: (rowIdx: number, fields: Record<string, any>) => void;
  setAll?: (rows: T[]) => void;
}

export interface UploadPreviewRow {
  id: string;
  name: string;
  exists: boolean;
  raw: any;
  checked: boolean;
  extraLabel?: string; // e.g. for edges, both endpoints
}
