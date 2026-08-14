/**
 * Goodies Drop — Night Ops pack (Brian drops wave 1–4).
 * Gear, skyline, citykit sheets, props, brew → plane boards.
 */

import { useStudio } from "@/store/studio";
import { imageDataToBuffer, pixelateImage } from "@/lib/pixel/buffer";
import { stampTimeline } from "@/store/timeline";

const BASE = "/packs/goodies";

type Item = { file: string; name: string; x: number; y: number; max: number };

export type GoodiesItem = Item;

/** Combined catalog for category planes + library browser. */
export function allGoodiesItems(): GoodiesItem[] {
  const seen = new Set<string>();
  const out: GoodiesItem[] = [];
  for (const it of [...LAYOUT_CORE, ...LAYOUT_SKYLINE, ...LAYOUT_CITYKIT, ...LAYOUT_WAVE9]) {
    if (seen.has(it.file)) continue;
    seen.add(it.file);
    out.push(it);
  }
  return out;
}

/** Wave 1+2 catalog boards. */
const LAYOUT_CORE: Item[] = [
  { file: "gear/inventory_weapons_armor.png", name: "Gear · weapons & armor", x: 0, y: 0, max: 300 },
  { file: "creatures/fish_and_tech.png", name: "Creatures · bio/tech", x: 340, y: 0, max: 260 },
  { file: "roads/city_road_grid.png", name: "Roads · city grid", x: 0, y: 340, max: 320 },
  { file: "tiles/cyber_roads_magenta.png", name: "Tiles · neon roads", x: 360, y: 340, max: 300 },
  { file: "buildings/nMCsy.jpg", name: "Buildings · facilities", x: 700, y: 0, max: 260 },
  { file: "buildings/nUpcQ.jpg", name: "Buildings · districts", x: 1000, y: 0, max: 260 },
  { file: "buildings/wMqaj.jpg", name: "Buildings · industrial", x: 700, y: 280, max: 260 },
  { file: "buildings/jxi1x.jpg", name: "Buildings · megablocks", x: 1000, y: 280, max: 260 },
  { file: "buildings/mOZOE.jpg", name: "Buildings · junctions", x: 1300, y: 0, max: 240 },
  { file: "ui/system_paused.png", name: "UI · system paused", x: 0, y: 720, max: 180 },
  { file: "ui/pause_menu.png", name: "UI · pause HUD", x: 220, y: 720, max: 180 },
  { file: "ui/active_leads.png", name: "UI · active leads", x: 440, y: 720, max: 160 },
  { file: "ui/city_grid_map.png", name: "UI · city grid map", x: 640, y: 720, max: 160 },
  { file: "ui/buttons_cyan_pink.png", name: "UI · button set A", x: 840, y: 720, max: 200 },
  { file: "ui/buttons_variants.png", name: "UI · button set B", x: 1080, y: 720, max: 200 },
  { file: "ui/integrity_energy_bars.png", name: "UI · integrity/energy", x: 1320, y: 720, max: 150 },
  { file: "props/shelf_full.png", name: "Props · stocked shelf", x: 1300, y: 280, max: 150 },
  { file: "props/shelf_emptyish.png", name: "Props · warehouse shelf", x: 1500, y: 280, max: 150 },
  { file: "props/office_desks_servers.png", name: "Props · office + servers", x: 1500, y: 0, max: 180 },
  { file: "solitaire/win_loss_counter.png", name: "Solitaire · win/loss chrome", x: 1500, y: 480, max: 110 },
  { file: "buildings/landmarks_metro_crane.jpg", name: "Landmarks · metro & crane", x: 0, y: 980, max: 320 },
  { file: "buildings/industrial_hangar_ship.jpg", name: "Industrial · hangar & ship", x: 360, y: 980, max: 300 },
  { file: "buildings/street_shops_named.jpg", name: "Street · named shops", x: 700, y: 980, max: 320 },
  { file: "buildings/ports_cargo_power.jpg", name: "Ports · cargo & power", x: 1060, y: 980, max: 300 },
  { file: "props/cyber_office_furniture.png", name: "Props · cyber office furniture", x: 1400, y: 980, max: 240 },
  { file: "gear/weapons_cyan_heavy.png", name: "Gear · cyan heavy weapons", x: 0, y: 1380, max: 360 },
  { file: "gear/weapons_blue_magic.png", name: "Gear · blue magic arsenal", x: 400, y: 1380, max: 320 },
  { file: "gear/weapons_rifles_gadgets.png", name: "Gear · rifles & gadgets", x: 760, y: 1380, max: 360 },
  { file: "fx/hp_bar_strip.png", name: "FX · HP bar strip", x: 1160, y: 1380, max: 200 },
  { file: "items/scavenge_loot.jpg", name: "Items · scavenge loot", x: 0, y: 1780, max: 220 },
  { file: "items/quest_tools_1_8.jpg", name: "Items · quest tools 1–8", x: 260, y: 1780, max: 260 },
  { file: "items/quest_icons_utility.jpg", name: "Items · utility icons", x: 560, y: 1780, max: 220 },
  { file: "items/quest_gadgets_named.jpg", name: "Items · named gadgets", x: 820, y: 1780, max: 260 },
  { file: "items/smokes_packs.jpg", name: "Items · street smokes", x: 1120, y: 1780, max: 200 },
  { file: "drinks/brewing_ui.jpg", name: "Brew · station UI", x: 0, y: 2120, max: 280 },
  { file: "drinks/brewing_station_full.jpg", name: "Brew · full station", x: 320, y: 2120, max: 300 },
  { file: "drinks/cooking_ui_icons.jpg", name: "Cook · profession icons", x: 660, y: 2120, max: 240 },
  { file: "drinks/cocktails_menu_a.jpg", name: "Bar · cocktail menu A", x: 940, y: 2120, max: 260 },
  { file: "drinks/distill_ingredients.jpg", name: "Bar · distill ingredients", x: 1240, y: 2120, max: 220 },
  { file: "drinks/potion_bottles.jpg", name: "Brew · potion bottles", x: 0, y: 2460, max: 240 },
  { file: "drinks/sauces_hot.jpg", name: "Kitchen · sauces & heat", x: 280, y: 2460, max: 220 },
  { file: "drinks/shots_fx.jpg", name: "Bar · shot effects", x: 540, y: 2460, max: 220 },
  { file: "drinks/named_pours.jpg", name: "Bar · named pours", x: 800, y: 2460, max: 240 },
  { file: "drinks/bladerunner_menu.jpg", name: "Bar · Blade runner menu", x: 1080, y: 2460, max: 260 },
  { file: "props/psu_fan_cube.jpg", name: "Props · PSU fan cube", x: 1400, y: 2460, max: 160 },
];

/** Wave 3 — isometric skyline buildings. */
const LAYOUT_SKYLINE: Item[] = [
  { file: "skyline/corp_tower.jpg", name: "Skyline · Corp tower", x: 0, y: 0, max: 160 },
  { file: "skyline/control_tower.jpg", name: "Skyline · Control tower", x: 200, y: 0, max: 160 },
  { file: "skyline/ware_6x6.jpg", name: "Skyline · WARE 6×6", x: 400, y: 0, max: 150 },
  { file: "skyline/plaza_twins.jpg", name: "Skyline · Plaza twins", x: 600, y: 0, max: 180 },
  { file: "skyline/broadcast_tower.jpg", name: "Skyline · Broadcast tower", x: 820, y: 0, max: 160 },
  { file: "skyline/chrome_tools.jpg", name: "Skyline · Chrome Tools", x: 1020, y: 0, max: 150 },
  { file: "skyline/holo_gear.jpg", name: "Skyline · Holo Gear", x: 1220, y: 0, max: 150 },
  { file: "skyline/core_stack.jpg", name: "Skyline · Core Stack", x: 0, y: 240, max: 140 },
  { file: "skyline/duplex_neon.jpg", name: "Skyline · Neon duplex", x: 180, y: 240, max: 160 },
  { file: "skyline/data_core.jpg", name: "Skyline · Data core", x: 380, y: 240, max: 160 },
  { file: "skyline/beacon_spire.jpg", name: "Skyline · Beacon spire", x: 580, y: 240, max: 160 },
  { file: "skyline/hab_fortress.jpg", name: "Skyline · Hab Fortress", x: 780, y: 240, max: 170 },
  { file: "skyline/diamond_hq.jpg", name: "Skyline · Diamond HQ", x: 1000, y: 240, max: 150 },
  { file: "skyline/sat_hub.jpg", name: "Skyline · Satellite hub", x: 1200, y: 240, max: 160 },
  { file: "skyline/fire_escape_block.jpg", name: "Skyline · Fire-escape block", x: 1400, y: 240, max: 160 },
];

/** Wave 4 — magenta city kit sheets (vehicles, roads, modular city). */
const LAYOUT_CITYKIT: Item[] = [
  // vehicles
  { file: "citykit/cars_neon_topdown.jpg", name: "City · neon cars topdown", x: 0, y: 0, max: 340 },
  { file: "citykit/cars_clean_damaged.jpg", name: "City · clean/damaged cars", x: 380, y: 0, max: 300 },
  { file: "citykit/cars_weaponized.jpg", name: "City · weaponized cars", x: 720, y: 0, max: 280 },
  { file: "citykit/truck_pickup_8dir.jpg", name: "City · pickup 8-dir", x: 1040, y: 0, max: 300 },
  { file: "citykit/trains_containers.jpg", name: "City · trains & containers", x: 1380, y: 0, max: 280 },
  // roads / connectors
  { file: "citykit/connectors_roads_rails.jpg", name: "City · road/rail connectors", x: 0, y: 360, max: 340 },
  { file: "citykit/road_markings.jpg", name: "City · road markings", x: 380, y: 360, max: 300 },
  { file: "citykit/street_details_debris.jpg", name: "City · street debris", x: 720, y: 360, max: 280 },
  { file: "citykit/walkways_stations.jpg", name: "City · walkways & stations", x: 1040, y: 360, max: 300 },
  // towers / facades
  { file: "citykit/towers_purple_front.jpg", name: "City · purple towers", x: 0, y: 720, max: 300 },
  { file: "citykit/towers_neon_variants.jpg", name: "City · neon tower variants", x: 340, y: 720, max: 300 },
  { file: "citykit/facades_neon_colorways.jpg", name: "City · neon facades", x: 680, y: 720, max: 300 },
  { file: "citykit/mansions_gothic_cyber.jpg", name: "City · gothic cyber mansions", x: 1020, y: 720, max: 320 },
  { file: "citykit/houses_suburban.jpg", name: "City · suburban houses", x: 1380, y: 720, max: 260 },
  // modular / industrial
  { file: "citykit/modular_buildings_mid.jpg", name: "City · modular mid", x: 0, y: 1100, max: 340 },
  { file: "citykit/modular_blocks_low.jpg", name: "City · modular low", x: 380, y: 1100, max: 320 },
  { file: "citykit/industrial_blocks.jpg", name: "City · industrial blocks", x: 740, y: 1100, max: 300 },
  { file: "citykit/industrial_plant.jpg", name: "City · industrial plant", x: 1080, y: 1100, max: 320 },
  { file: "citykit/hangars_cranes.jpg", name: "City · hangars & cranes", x: 1440, y: 1100, max: 280 },
  // roofs / air / compounds
  { file: "citykit/rooftop_modules.jpg", name: "City · rooftop modules", x: 0, y: 1480, max: 300 },
  { file: "citykit/rooftops_neon_antenna.jpg", name: "City · neon rooftops", x: 340, y: 1480, max: 300 },
  { file: "citykit/roofs_hvac_solar.jpg", name: "City · HVAC & solar roofs", x: 680, y: 1480, max: 300 },
  { file: "citykit/airport_hangars.jpg", name: "City · airport & hangars", x: 1020, y: 1480, max: 300 },
  { file: "citykit/compounds_plazas.jpg", name: "City · compounds & plazas", x: 1360, y: 1480, max: 300 },
  // —— wave 5 —— shops / signs / vehicles / roads / industry
  { file: "citykit/shops_streetfront.jpg", name: "City · streetfront shops", x: 0, y: 1860, max: 300 },
  { file: "citykit/shops_neon_jp_signs.jpg", name: "City · JP neon shop signs", x: 340, y: 1860, max: 280 },
  { file: "citykit/towers_neon_jp_labels.jpg", name: "City · neon JP towers", x: 660, y: 1860, max: 280 },
  { file: "citykit/storefront_facades_flat.jpg", name: "City · flat storefronts", x: 980, y: 1860, max: 280 },
  { file: "citykit/shacks_slums_iso.jpg", name: "City · slum shacks", x: 1300, y: 1860, max: 280 },
  { file: "citykit/vehicles_armored.jpg", name: "City · armored vehicles", x: 0, y: 2220, max: 300 },
  { file: "citykit/trains_maglev_sets.jpg", name: "City · maglev trains", x: 340, y: 2220, max: 340 },
  { file: "citykit/elevated_rails.jpg", name: "City · elevated rails", x: 720, y: 2220, max: 320 },
  { file: "citykit/roads_cyber_fullset.jpg", name: "City · cyber road set", x: 1080, y: 2220, max: 340 },
  { file: "citykit/roads_intersections_cobble.jpg", name: "City · cobble intersections", x: 0, y: 2600, max: 300 },
  { file: "citykit/roads_junctions_simple.jpg", name: "City · simple junctions", x: 340, y: 2600, max: 280 },
  { file: "citykit/street_atlas_modular.jpg", name: "City · modular street atlas", x: 660, y: 2600, max: 320 },
  { file: "citykit/alleys_neon_graffiti.jpg", name: "City · neon alleys", x: 1020, y: 2600, max: 300 },
  { file: "citykit/debris_barriers_props.jpg", name: "City · debris & barriers", x: 1360, y: 2600, max: 280 },
  { file: "citykit/modular_angular_towers.jpg", name: "City · angular modular", x: 0, y: 2960, max: 300 },
  { file: "citykit/towers_highrise_purple.jpg", name: "City · purple highrise", x: 340, y: 2960, max: 300 },
  { file: "citykit/towers_purple_base.jpg", name: "City · purple base towers", x: 680, y: 2960, max: 300 },
  { file: "citykit/civic_temples_topdown.jpg", name: "City · civic temples", x: 1020, y: 2960, max: 300 },
  { file: "citykit/fortress_plazas.jpg", name: "City · fortress plazas", x: 1360, y: 2960, max: 300 },
  { file: "citykit/castles_dark_fort.jpg", name: "City · dark castles", x: 0, y: 3320, max: 300 },
  { file: "citykit/purple_forts_tunnels.jpg", name: "City · purple forts/tunnels", x: 340, y: 3320, max: 300 },
  { file: "citykit/factories_process.jpg", name: "City · process factories", x: 680, y: 3320, max: 300 },
  { file: "citykit/factories_smoke_orange.jpg", name: "City · smoke factories", x: 1020, y: 3320, max: 300 },
  { file: "citykit/industrial_heavy_crane.jpg", name: "City · heavy industrial", x: 1360, y: 3320, max: 300 },
  { file: "citykit/industrial_neon_plants.jpg", name: "City · neon plants", x: 0, y: 3680, max: 300 },
  { file: "citykit/roofs_green_solar.jpg", name: "City · green/solar roofs", x: 340, y: 3680, max: 300 },
  { file: "citykit/roofs_hvac_industrial.jpg", name: "City · industrial HVAC roofs", x: 680, y: 3680, max: 300 },
  { file: "citykit/roofs_simple_grid.jpg", name: "City · simple grid roofs", x: 1020, y: 3680, max: 280 },
  { file: "citykit/pipes_ducts_hubs.jpg", name: "City · pipes & duct hubs", x: 1340, y: 3680, max: 300 },
  { file: "citykit/corridors_walls_doors.jpg", name: "City · corridors & walls", x: 0, y: 4040, max: 340 },
  { file: "citykit/elevators_shafts.jpg", name: "City · elevator shafts", x: 380, y: 4040, max: 240 },
  // —— wave 6 —— hospitals · port · rails · rust · neon roads · pods
  { file: "citykit/buildings_industrial_front.jpg", name: "City · industrial fronts", x: 0, y: 4400, max: 300 },
  { file: "citykit/utility_plants_small.jpg", name: "City · utility plants", x: 340, y: 4400, max: 300 },
  { file: "citykit/midrise_apartments.jpg", name: "City · midrise apts", x: 680, y: 4400, max: 300 },
  { file: "citykit/hospitals_civic.jpg", name: "City · hospitals & civic", x: 1020, y: 4400, max: 300 },
  { file: "citykit/compounds_L_cross_T.jpg", name: "City · L/cross/T compounds", x: 1360, y: 4400, max: 300 },
  { file: "citykit/skyline_mixed_atrium.jpg", name: "City · atrium skyline", x: 0, y: 4760, max: 300 },
  { file: "citykit/rails_tracks_connectors.jpg", name: "City · rail tracks", x: 340, y: 4760, max: 300 },
  { file: "citykit/industrial_rooftop_plant.jpg", name: "City · rooftop plants", x: 680, y: 4760, max: 300 },
  { file: "citykit/roads_curves_Y_full.jpg", name: "City · curve/Y roads", x: 1020, y: 4760, max: 300 },
  { file: "citykit/vehicles_rust_sedans.jpg", name: "City · rusted sedans", x: 1360, y: 4760, max: 280 },
  { file: "citykit/street_props_manholes.jpg", name: "City · manholes & signs", x: 0, y: 5120, max: 280 },
  { file: "citykit/modular_neon_purple.jpg", name: "City · purple neon modular", x: 320, y: 5120, max: 300 },
  { file: "citykit/roofs_labeled_venues.jpg", name: "City · labeled venues", x: 660, y: 5120, max: 300 },
  { file: "citykit/pods_purple_modular.jpg", name: "City · purple pods", x: 1000, y: 5120, max: 300 },
  { file: "citykit/roads_neon_strips.jpg", name: "City · neon road strips", x: 1340, y: 5120, max: 300 },
  { file: "citykit/vehicles_armored_side.jpg", name: "City · armored side views", x: 0, y: 5480, max: 300 },
  { file: "citykit/roofs_dark_civic.jpg", name: "City · dark civic roofs", x: 340, y: 5480, max: 300 },
  { file: "citykit/trains_hover_cars.jpg", name: "City · hover trains", x: 680, y: 5480, max: 320 },
  { file: "citykit/hangars_airport_tanks.jpg", name: "City · hangars & tanks", x: 1040, y: 5480, max: 300 },
  { file: "citykit/roads_neon_props_full.jpg", name: "City · neon roads + props", x: 1380, y: 5480, max: 300 },
  { file: "citykit/vehicles_civilian_fleet.jpg", name: "City · civilian fleet", x: 0, y: 5840, max: 300 },
  { file: "citykit/forts_tiered_purple.jpg", name: "City · tiered forts", x: 340, y: 5840, max: 300 },
  { file: "citykit/roofs_slum_iso.jpg", name: "City · slum rooftops", x: 680, y: 5840, max: 300 },
  { file: "citykit/towers_neon_skyscraper.jpg", name: "City · neon skyscrapers", x: 1020, y: 5840, max: 300 },
  { file: "citykit/roads_tiles_props_signs.jpg", name: "City · road tiles & signs", x: 1360, y: 5840, max: 280 },
  { file: "citykit/port_cranes_containers.jpg", name: "City · port cranes", x: 0, y: 6200, max: 320 },
  // —— wave 7 —— bikes · EMS · factories · interiors · mega-bases
  { file: "citykit/vehicles_motorcycles.jpg", name: "City · motorcycles", x: 360, y: 6200, max: 300 },
  { file: "citykit/hangars_airport_front.jpg", name: "City · hangar fronts", x: 700, y: 6200, max: 300 },
  { file: "citykit/cranes_gantry_sheds.jpg", name: "City · gantry + sheds", x: 1040, y: 6200, max: 300 },
  { file: "citykit/buildings_neon_fronts.jpg", name: "City · neon fronts", x: 1380, y: 6200, max: 300 },
  { file: "citykit/apartments_rooftop_gear.jpg", name: "City · apt rooftop gear", x: 0, y: 6560, max: 300 },
  { file: "citykit/industrial_pipes_tanks.jpg", name: "City · pipes & tanks", x: 340, y: 6560, max: 300 },
  { file: "citykit/pipes_purple_modular.jpg", name: "City · purple pipes", x: 680, y: 6560, max: 300 },
  { file: "citykit/street_props_cameras.jpg", name: "City · cameras & street", x: 1020, y: 6560, max: 280 },
  { file: "citykit/bases_mega_fortress.jpg", name: "City · mega fortresses", x: 1340, y: 6560, max: 300 },
  { file: "citykit/trains_cars_stations.jpg", name: "City · train cars", x: 0, y: 6920, max: 300 },
  { file: "citykit/facades_slum_street.jpg", name: "City · slum facades", x: 340, y: 6920, max: 300 },
  { file: "citykit/shopfronts_industrial.jpg", name: "City · industrial shops", x: 680, y: 6920, max: 300 },
  { file: "citykit/towers_cyber_bases.jpg", name: "City · cyber towers", x: 1020, y: 6920, max: 300 },
  { file: "citykit/roofs_dense_tech.jpg", name: "City · dense tech roofs", x: 1360, y: 6920, max: 300 },
  { file: "citykit/servers_tech_rooms.jpg", name: "City · server rooms", x: 0, y: 7280, max: 300 },
  { file: "citykit/interior_living_room.jpg", name: "City · living room props", x: 340, y: 7280, max: 280 },
  { file: "citykit/vehicles_armed_cyber.jpg", name: "City · armed cyber cars", x: 660, y: 7280, max: 300 },
  { file: "citykit/facades_dense_cyber.jpg", name: "City · dense cyber faces", x: 1000, y: 7280, max: 300 },
  { file: "citykit/bases_large_compounds.jpg", name: "City · large compounds", x: 1340, y: 7280, max: 300 },
  { file: "citykit/roofs_helipad_tech.jpg", name: "City · helipad roofs", x: 0, y: 7640, max: 300 },
  { file: "citykit/vehicles_emergency.jpg", name: "City · EMS fleet", x: 340, y: 7640, max: 300 },
  { file: "citykit/vehicles_ems_damage.jpg", name: "City · EMS damage states", x: 680, y: 7640, max: 300 },
  { file: "citykit/modular_purple_tubes.jpg", name: "City · purple tubes", x: 1020, y: 7640, max: 300 },
  { file: "citykit/vehicles_color_fleet.jpg", name: "City · color car fleet", x: 1360, y: 7640, max: 300 },
  { file: "citykit/hubs_purple_tech.jpg", name: "City · purple tech hubs", x: 0, y: 8000, max: 300 },
  { file: "citykit/apartments_block_roofs.jpg", name: "City · block apt roofs", x: 340, y: 8000, max: 300 },
  { file: "citykit/vehicles_sedan_rotate.jpg", name: "City · sedan rotate", x: 680, y: 8000, max: 280 },
  { file: "citykit/roofs_garden_helipad.jpg", name: "City · garden helipads", x: 1000, y: 8000, max: 300 },
  { file: "citykit/vehicles_taxi_damage.jpg", name: "City · taxi damage", x: 1340, y: 8000, max: 280 },
  { file: "citykit/modular_purple_pieces.jpg", name: "City · purple pieces", x: 0, y: 8360, max: 300 },
  { file: "citykit/rails_cranes_buildings.jpg", name: "City · rails + cranes", x: 340, y: 8360, max: 300 },
  { file: "citykit/vehicles_sports_colors.jpg", name: "City · sports colors", x: 680, y: 8360, max: 280 },
  { file: "citykit/factories_heavy.jpg", name: "City · heavy factories", x: 1000, y: 8360, max: 300 },
  { file: "citykit/floors_pipe_platforms.jpg", name: "City · pipe platforms", x: 1340, y: 8360, max: 300 },
  // —— wave 8 —— highways · neon shops · police · buses · plants
  { file: "citykit/towers_neon_tech.jpg", name: "City · neon tech towers", x: 0, y: 8720, max: 300 },
  { file: "citykit/factories_pipe_maze.jpg", name: "City · pipe-maze plants", x: 340, y: 8720, max: 300 },
  { file: "citykit/modular_base_shapes.jpg", name: "City · base shapes", x: 680, y: 8720, max: 300 },
  { file: "citykit/apartments_lit_windows.jpg", name: "City · lit apartments", x: 1020, y: 8720, max: 300 },
  { file: "citykit/roads_elevated_highway.jpg", name: "City · elevated highway", x: 1360, y: 8720, max: 300 },
  { file: "citykit/storefronts_neon_signs.jpg", name: "City · neon storefronts", x: 0, y: 9080, max: 300 },
  { file: "citykit/buildings_temple_dark.jpg", name: "City · dark temples", x: 340, y: 9080, max: 300 },
  { file: "citykit/vehicles_blue_pickup.jpg", name: "City · blue pickup", x: 680, y: 9080, max: 240 },
  { file: "citykit/buildings_grey_mass.jpg", name: "City · grey mass pack", x: 960, y: 9080, max: 300 },
  { file: "citykit/modules_hangar_tower.jpg", name: "City · hangar modules", x: 1300, y: 9080, max: 300 },
  { file: "citykit/fortress_industrial_dark.jpg", name: "City · dark fortresses", x: 0, y: 9440, max: 300 },
  { file: "citykit/vehicles_armed_color.jpg", name: "City · armed color cars", x: 340, y: 9440, max: 280 },
  { file: "citykit/apartments_purple_neon.jpg", name: "City · purple neon apts", x: 660, y: 9440, max: 300 },
  { file: "citykit/alleys_neon_street.jpg", name: "City · neon alleys", x: 1000, y: 9440, max: 300 },
  { file: "citykit/hangars_warehouse_front.jpg", name: "City · warehouse fronts", x: 1340, y: 9440, max: 300 },
  { file: "citykit/vehicles_van_damage.jpg", name: "City · van damage", x: 0, y: 9800, max: 300 },
  { file: "citykit/factories_color_plants.jpg", name: "City · color plants", x: 340, y: 9800, max: 300 },
  { file: "citykit/cranes_gantry_detail.jpg", name: "City · gantry detail", x: 680, y: 9800, max: 300 },
  { file: "citykit/vehicles_cyber_trucks.jpg", name: "City · cyber trucks", x: 1020, y: 9800, max: 300 },
  { file: "citykit/vehicles_police_fleet.jpg", name: "City · police fleet", x: 1360, y: 9800, max: 280 },
  { file: "citykit/airport_hangars_tower.jpg", name: "City · airport hangars", x: 0, y: 10160, max: 300 },
  { file: "citykit/stores_big_box.jpg", name: "City · big-box stores", x: 340, y: 10160, max: 300 },
  { file: "citykit/vehicles_bus_damage.jpg", name: "City · bus damage", x: 680, y: 10160, max: 300 },
  { file: "citykit/vehicles_armed_dark.jpg", name: "City · armed dark cars", x: 1020, y: 10160, max: 280 },
];

/** Wave 9 — leftover sheets + FX lab source. */
const LAYOUT_WAVE9: Item[] = [
  { file: "drinks/cooking_profession.jpg", name: "Cook · profession sheet", x: 0, y: 0, max: 280 },
  { file: "ui/integrity_bar.png", name: "UI · integrity bar", x: 320, y: 0, max: 220 },
  { file: "fx/hp_bar_strip.png", name: "FX · HP bar strip", x: 580, y: 0, max: 220 },
  { file: "ui/integrity_energy_bars.png", name: "UI · integrity/energy", x: 840, y: 0, max: 180 },
  { file: "drinks/shots_fx.jpg", name: "Bar · shot effects", x: 0, y: 280, max: 240 },
  { file: "items/quest_icons_utility.jpg", name: "Items · utility icons", x: 280, y: 280, max: 220 },
];

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(url));
    im.src = url;
  });
}

function toBoard(img: HTMLImageElement, max: number) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const full = ctx.getImageData(0, 0, img.width, img.height);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(8, Math.round(img.width * scale));
  const h = Math.max(8, Math.round(img.height * scale));
  if (scale < 1) return { data: pixelateImage(full, w, h, "16bit"), w, h };
  return { data: imageDataToBuffer(full), w: img.width, h: img.height };
}

async function placeLayout(
  layout: Item[],
  ox: number,
  oy: number,
  grid?: { cols: number; cell: number },
): Promise<string[]> {
  const studio = useStudio.getState();
  const ids: string[] = [];
  let i = 0;
  for (const item of layout) {
    try {
      const img = await loadImage(`${BASE}/${item.file}`);
      const { data, w, h } = toBoard(img, item.max);
      const px = grid
        ? ox + (i % grid.cols) * grid.cell
        : ox + item.x;
      const py = grid
        ? oy + Math.floor(i / grid.cols) * grid.cell
        : oy + item.y;
      const id = studio.importImageToArtboard(data, w, h, item.name, px, py);
      ids.push(id);
      i++;
    } catch {
      /* skip */
    }
  }
  return ids;
}

export async function placeGoodiesGrid(
  items: Item[],
  ox: number,
  oy: number,
  cols = 5,
  cell = 280,
): Promise<string[]> {
  return placeLayout(items, ox, oy, { cols, cell });
}

/** Full dump wave 1–4. */
export async function summonGoodiesDrop(): Promise<number> {
  const studio = useStudio.getState();
  const cam = studio.camera;
  const z = cam.zoom || 1;
  const ox = (-cam.x + 160) / z;
  const oy = (-cam.y + 80) / z;

  const a = (await placeLayout(LAYOUT_CORE, ox, oy)).length;
  const b = (await placeLayout(LAYOUT_SKYLINE, ox, oy + 2800)).length;
  const c = (await placeLayout(LAYOUT_CITYKIT, ox, oy + 3400)).length;
  const placed = a + b + c;

  if (placed) {
    studio.createWireZone(ox - 40, oy - 40, 1900, 15600, "environments");
    const zones = useStudio.getState().wireZones;
    const last = zones[zones.length - 1];
    if (last) studio.renameWireZone(last.id, "Goodies · Night Ops (wave 1–8)");
    studio.setStatus(`Goodies Drop · ${placed} boards · citykit 139 + skyline + arsenal`);
    studio.setCamera({ x: -ox * z + 40, y: -oy * z + 40, zoom: Math.min(0.22, z) });
    stampTimeline("Goodies wave 1–4", `${placed} boards`);
  } else {
    studio.setStatus("Goodies pack failed to load");
  }
  return placed;
}

/** Just the isometric skyline set. */
export async function summonSkylineSet(): Promise<number> {
  const studio = useStudio.getState();
  const cam = studio.camera;
  const z = cam.zoom || 1;
  const ox = (-cam.x + 200) / z;
  const oy = (-cam.y + 100) / z;

  const placed = (await placeLayout(LAYOUT_SKYLINE, ox, oy)).length;
  if (placed) {
    studio.createWireZone(ox - 40, oy - 40, 1700, 520, "environments");
    const zones = useStudio.getState().wireZones;
    const last = zones[zones.length - 1];
    if (last) studio.renameWireZone(last.id, "Skyline kit · iso buildings");
    studio.setStatus(`Skyline kit · ${placed} buildings on plane`);
    studio.setCamera({ x: -ox * z + 40, y: -oy * z + 40, zoom: Math.min(0.55, z) });
    stampTimeline("Skyline kit", `${placed} buildings`);
  }
  return placed;
}

/** Wave 4 city kit only — vehicles, roads, modular city sheets. */
export async function summonCityKit(): Promise<number> {
  const studio = useStudio.getState();
  const cam = studio.camera;
  const z = cam.zoom || 1;
  const ox = (-cam.x + 180) / z;
  const oy = (-cam.y + 90) / z;

  const placed = (await placeLayout(LAYOUT_CITYKIT, ox, oy)).length;
  if (placed) {
    studio.createWireZone(ox - 40, oy - 40, 1850, 10600, "environments");
    const zones = useStudio.getState().wireZones;
    const last = zones[zones.length - 1];
    if (last) studio.renameWireZone(last.id, "City kit · highways · neon shops · police · buses");
    studio.setStatus(`City kit · ${placed} sheets (highways, neon shops, police, buses)`);
    studio.setCamera({ x: -ox * z + 40, y: -oy * z + 40, zoom: Math.min(0.35, z) });
    stampTimeline("City kit", `${placed} sheets`);
  }
  return placed;
}

const FX_LAB_EMITTERS: Array<{
  kind: "spark" | "smoke" | "magic" | "dust" | "slash";
  color: string;
  name: string;
}> = [
  { kind: "spark", color: "#fb923c", name: "Spark jet" },
  { kind: "smoke", color: "#94a3b8", name: "Smoke column" },
  { kind: "magic", color: "#c084fc", name: "Magic swirl" },
  { kind: "dust", color: "#d6b07c", name: "Dust settle" },
  { kind: "slash", color: "#3ecfcf", name: "Slash arc" },
];

function placeFxEmitters(ox: number, oy: number) {
  const studio = useStudio.getState();
  const names = new Set(studio.particles.map((p) => p.name));
  const add = FX_LAB_EMITTERS.filter((k) => !names.has(k.name)).map((k, i) => ({
    id: `fx_lab_${k.kind}_${i}`,
    name: k.name,
    x: ox + i * 76,
    y: oy,
    w: 60,
    h: 60,
    kind: k.kind,
    rate: 18,
    life: 1.05,
    color: k.color,
    playing: true,
  }));
  if (add.length) {
    useStudio.setState({
      particles: [...studio.particles, ...add],
    });
  }
  return add.length;
}

/** Wave 9 — leftover boards + FX emitter row + shader lab. */
export async function summonFxLab(): Promise<number> {
  const studio = useStudio.getState();
  const cam = studio.camera;
  const z = cam.zoom || 1;
  const ox = (-cam.x + 180) / z;
  const oy = (-cam.y + 90) / z;

  const placed = (await placeLayout(LAYOUT_WAVE9, ox, oy)).length;
  const emitters = placeFxEmitters(ox, oy + 520);

  try {
    const { useShaderGraph } = await import("@/store/shader-graph");
    if (useShaderGraph.getState().graphs.length === 0) {
      useShaderGraph.getState().seedLab(false);
    }
    const g = useShaderGraph.getState().graphs[0];
    if (g) {
      useShaderGraph.getState().moveGraph(g.id, Math.round(ox + 40), Math.round(oy + 640));
    }
  } catch {
    /* */
  }

  if (placed || emitters) {
    studio.createWireZone(ox - 40, oy - 40, 1180, 980, "effects");
    const zones = useStudio.getState().wireZones;
    const last = zones[zones.length - 1];
    if (last) studio.renameWireZone(last.id, "FX Lab · Wave 9");
    studio.setStatus(`FX Lab · ${placed} boards · ${emitters} emitters · shader graph live`);
    studio.setCamera({ x: -ox * z + 40, y: -oy * z + 40, zoom: Math.min(0.45, z) });
    stampTimeline("FX Lab wave 9", `${placed} boards + ${emitters} FX`);
  } else {
    studio.setStatus("FX Lab failed to load");
  }
  return placed + emitters;
}

/** Named quest tools from drop art (for inventory kernel). */
export const QUEST_TOOL_LABELS = [
  "Audio Deck",
  "Isolation Beads",
  "Maint Wrench",
  "Trojan Drive",
  "Piston Fuel",
  "Matrix Chip",
  "Hazard Boots",
  "Access Pass",
] as const;
