export type ToolId =
  | "select"
  | "move"
  | "pan"
  | "brush"
  | "eraser"
  | "fill"
  | "eyedropper"
  | "line"
  | "rect"
  | "ellipse"
  | "marquee"
  | "anim-region"
  | "particle"
  | "place"
  | "wire-zone"
  | "destructible"
  | "quest-tree"
  | "game-viewport"
  | "constraint-stamp";

export type PixelMode = "8bit" | "16bit" | "hd";

export type Layer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  data: Uint8ClampedArray;
  rev: number;
};

export type Artboard = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layers: Layer[];
  activeLayerId: string;
  kind: "sheet" | "scene" | "hud" | "note" | "indoor" | "variant";
  /** External bitmap (starter / VFX pack). Hollow layers; canvas blits this. */
  sourceUrl?: string | null;
};

export type AnimFrame = {
  id: string;
  data: Uint8ClampedArray;
  durationMs?: number;
  label?: string;
};

export type AnimBeastMeta = {
  secondaryIds?: string[];
  secondaryKinds?: string[];
  cosmeticIds?: string[];
  cosmeticsApplied?: string[];
  lastAuditScore?: number;
  [key: string]: unknown;
};

export type AnimRegion = {
  id: string;
  name: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  frameW: number;
  frameH: number;
  frames: AnimFrame[];
  fps: number;
  playing: boolean;
  frameIndex?: number;
  currentFrame: number;
  loop?: boolean;
  onionSkin?: boolean;
  beast?: AnimBeastMeta;
  [key: string]: unknown;
};

export type ParticleKind = "spark" | "smoke" | "magic" | "dust" | "slash" | string;

export type ParticleSystem = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ParticleKind;
  rate: number;
  life: number;
  color: string;
  enabled?: boolean;
  playing?: boolean;
  [key: string]: unknown;
};

export type SceneActor = {
  id: string;
  name?: string;
  x: number;
  y: number;
  animId: string;
  scale?: number;
  facing?: number;
  [key: string]: unknown;
};

export type ParallaxLayer = {
  id: string;
  name: string;
  artboardId?: string | null;
  speedX: number;
  speedY: number;
  offsetX?: number;
  offsetY?: number;
  depth?: number;
  visible?: boolean;
  [key: string]: unknown;
};

export type ParallaxMode = "viewport" | "sheet";

export type ParallaxStack = {
  id: string;
  name: string;
  x: number;
  y: number;
  viewW: number;
  viewH: number;
  mode: ParallaxMode;
  layers: ParallaxLayer[];
  [key: string]: unknown;
};

export type Selection = {
  artboardId: string;
  x: number;
  y: number;
  w: number;
  h: number;
} | null;

export type Camera = {
  x: number;
  y: number;
  zoom: number;
};

export type ProjectMeta = {
  name: string;
  pixelMode: PixelMode;
  showGrid?: boolean;
  snapGrid?: number;
  gridSize?: number;
  onionSkin?: boolean;
  [key: string]: unknown;
};

export type EngineId = "godot" | "unity" | "unreal" | "gamemaker" | "generic";

export type WireCategory =
  | "characters"
  | "animations"
  | "environments"
  | "parallax"
  | "objects"
  | "destructibles"
  | "items"
  | "effects"
  | "particles"
  | "ui"
  | "hud"
  | "chrome"
  | "scenes"
  | "quests"
  | "notes"
  | "custom";

export type PixelSizePreset = 8 | 16 | 24 | 32 | 48 | 64 | 96 | 128 | 256;

export type AssetFolder = {
  id: string;
  name: string;
  category: WireCategory;
  path: string;
  children: AssetFolder[];
  pixelSize?: number;
  inheritsSize: boolean;
  isEntityRoot: boolean;
  createdAt: number;
};

export type EngineProject = {
  id: string;
  name: string;
  engine: EngineId;
  rootFolderName: string;
  connected: boolean;
  connectedAt: number | null;
  folders: AssetFolder[];
  sizeDefaults: Record<WireCategory, number>;
};

export type WireZone = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  category: WireCategory;
  folderId: string | null;
  folderPath: string | null;
  color: string;
  enabled: boolean;
  questTreeId?: string | null;
  destructibleId?: string | null;
  /** Armed craft / mutate action for this feed plane. */
  trigger?: {
    kind: "none" | "boil" | "tile_kit" | "qa" | "mutate" | "bloom";
    armed: boolean;
    lastFiredAt?: number;
  };
};

export type WireConnectorKind = WireCategory;

export type PendingWireDrop = {
  zoneId: string | null;
  draft?: { x: number; y: number; w: number; h: number };
  category: WireCategory;
  screenX: number;
  screenY: number;
} | null;

export type DestructibleStage = {
  id: string;
  hpMax: number;
  label: string;
  artboardId?: string | null;
};

export type DestructibleProp = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  maxHp: number;
  hp: number;
  stages: DestructibleStage[];
  drops: string[];
  debrisParticleId?: string | null;
  folderId?: string | null;
  folderPath?: string | null;
  color: string;
  engineBreakable: boolean;
};

export type QuestNodeKind =
  | "start"
  | "objective"
  | "branch"
  | "condition"
  | "dialogue"
  | "reward"
  | "fail"
  | "gate"
  | "end";

export type QuestNode = {
  id: string;
  kind: QuestNodeKind;
  title: string;
  body: string;
  x: number;
  y: number;
  next: string[];
  edgeLabels?: Record<string, string>;
  links?: {
    destructibleId?: string;
    artboardId?: string;
    animId?: string;
    itemTag?: string;
  };
};

export type QuestTree = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  nodes: QuestNode[];
  folderId?: string | null;
  folderPath?: string | null;
  color: string;
  wireZoneId?: string | null;
};
