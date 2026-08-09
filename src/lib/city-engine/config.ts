/**
 * PixelPlane City Engine — clean-room top-down sandbox config.
 * Mechanics inspired by classic open-world crime sandboxes (ideas only).
 * Architecture notes from open-source GTA1 reimplementations (Carnage3D MIT, FreeCrime)
 * — we write 100% original code + Brian's original art.
 */

export const ENGINE = {
  /** World pixels = map image * this */
  mapScale: 4,
  mapUrl: "/engine/city_map.jpg",
  vehicleSheetUrl: "/engine/vehicles.jpg",
  /** Driving shows more city (like reference city tileset view) */
  zoomDrive: 1.1,
  /** On foot closer (vehicle sheet scale feel) */
  zoomFoot: 2.6,
  /** Inside buildings — slightly closer than street foot cam */
  zoomIndoor: 3.0,
  zoomLerp: 0.08,
  /** Player foot */
  footSpeed: 95,
  /** Vehicle */
  driveAccel: 220,
  driveMax: 210,
  driveBrake: 280,
  driveDrag: 1.8,
  steerRate: 2.6,
  enterRadius: 70,
  /** Building door interact radius (world px) */
  doorRadius: 56,
  /** Simple wanted */
  wantedDecay: 0.08,
} as const;

/** Approximate slices on 400×660 vehicle sheet (left column vehicles) */
export type VehicleDef = {
  id: string;
  name: string;
  /** source rect on sheet */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** drawn size in world */
  w: number;
  h: number;
  maxSpeed: number;
  color: string;
};

export const VEHICLE_DEFS: VehicleDef[] = [
  { id: "semi", name: "Semi", sx: 96, sy: 26, sw: 164, sh: 76, w: 56, h: 26, maxSpeed: 160, color: "#4a90c8" },
  { id: "box", name: "Box truck", sx: 105, sy: 116, sw: 149, sh: 76, w: 50, h: 26, maxSpeed: 150, color: "#5a9ad0" },
  { id: "pickup", name: "Pickup", sx: 104, sy: 212, sw: 148, sh: 62, w: 46, h: 22, maxSpeed: 180, color: "#8a8f98" },
  { id: "van", name: "Van", sx: 104, sy: 284, sw: 150, sh: 68, w: 46, h: 22, maxSpeed: 165, color: "#9aa0a8" },
  { id: "sedan", name: "Sedan", sx: 118, sy: 364, sw: 136, sh: 64, w: 42, h: 20, maxSpeed: 200, color: "#b0b4bc" },
  { id: "coupe", name: "Coupe", sx: 118, sy: 440, sw: 126, sh: 64, w: 40, h: 20, maxSpeed: 210, color: "#a8acb4" },
  { id: "purple", name: "Street car", sx: 122, sy: 518, sw: 136, sh: 56, w: 40, h: 18, maxSpeed: 205, color: "#9b7bb8" },
  { id: "bike", name: "Bike", sx: 160, sy: 602, sw: 90, sh: 24, w: 28, h: 14, maxSpeed: 175, color: "#4a7ab8" },
];

export const CONTROLS_HELP = [
  "WASD / arrows — move or steer",
  "E / Enter — vehicle · building door · exit indoor",
  "F — smash nearest crate/barrel (or ram while driving)",
  "Shift — sprint (foot) / boost (drive)",
  "Space — brake",
  "Esc — back to Studio",
  "M — toggle minimap",
  "Studio quest trees auto-load as Active Quest (smash advances)",
  "Perspective profile: top-down open world (template ladder growing)",
].join("\n");
