# Chunk-Stitching QA Tracker — 96×64 Tile Chunks

Offline QA reference for world chunk borders: roads, rails, buildings, districts, water, and combined edges.

## Test Cases

*Chunk-Stitching QA Tracker — 96×64 Tile Chunks*

| Test Case ID | Test Case Name | Edge Type | Chunk Coordinates | Expected Behavior | Actual Result | Pass/Fail | Severity | Fix Notes | Last Tested Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-001 | Road Alignment Across Chunk Border (Horizontal) | road | Chunk (2,3) → (3,3) | A 4-tile-wide road exits the east edge of chunk (2,3) at tile rows 30–33 and must re-enter chunk (3,3) at the same tile rows with matching road type and lane markings. No gap, offset, or type mismatch. |  |  | Medium |  |  |
| TC-002 | Road Alignment Across Chunk Border (Vertical) | road | Chunk (4,2) → (4,3) | A 2-tile-wide road exits the south edge of chunk (4,2) at tile columns 48–49 and must re-enter chunk (4,3) at the same columns. No gap or lateral shift. |  |  | Medium |  |  |
| TC-003 | Road T-Intersection at Chunk Corner | road | Chunk (1,1) → (2,1) | A T-intersection straddles the chunk border. All three road arms must connect correctly, pavement markings align, and no phantom fourth arm appears. |  |  | High |  |  |
| TC-004 | Road Dead-End Detection at Chunk Edge | road | Chunk (5,4) → edge | A road that terminates at a chunk border with no matching road on the neighbor chunk must be capped with a valid dead-end tile (cul-de-sac, barrier, or T-cap). No open road stub. |  |  | High |  |  |
| TC-005 | Road Curve Continuity at Border | road | Chunk (0,2) → (1,2) | A curved road segment approaching the chunk border must exit at the correct angle and tile offset so the neighbor chunk can continue the curve without a kink or gap. |  |  | Medium |  |  |
| TC-006 | Rail Line Continuity (Straight) | rail | Chunk (3,0) → (4,0) | A single-track railway exits the east edge of chunk (3,0) at tile row 10 and must enter chunk (4,0) at the same row with matching track type (standard gauge). No gap, elevation mismatch, or alignment error. |  |  | Medium |  |  |
| TC-007 | Rail Elevation Change at Chunk Border | rail | Chunk (6,2) → (7,2) | A rail segment transitions from ground level to elevated (bridge) exactly at the chunk boundary. The bridge support structure must spawn correctly in both chunks with no floating segments. |  |  | High |  |  |
| TC-008 | Rail Switch / Junction at Chunk Border | rail | Chunk (2,5) → (3,5) | A rail switch point straddles the chunk border. Both diverging tracks must continue correctly into the neighbor chunk; switch state (open/closed) must persist across the boundary. |  |  | High |  |  |
| TC-009 | Rail Dead-End / Buffer Stop at Edge | rail | Chunk (8,3) → edge | A rail line that ends at a chunk border with no neighbor rail must receive a valid buffer-stop tile. No open track stub exposed to void. |  |  | High |  |  |
| TC-010 | Building Footprint Clipping (2×2 Building) | building boundary | Chunk (1,4) → (2,4) | A 2×2 building whose footprint straddles the chunk border must be split correctly: left half in chunk (1,4), right half in chunk (2,4). Both halves share the same building ID, render as a single structure, and have no seam artifact. |  |  | Medium |  |  |
| TC-011 | Building Footprint Clipping (Large L-Shaped) | building boundary | Chunk (3,3) → (4,3) | An L-shaped building (5×3 + 2×2 arm) straddling the chunk border must be split with the footprint preserved. No tile is double-claimed or missing; roof tiles cap correctly. |  |  | High |  |  |
| TC-012 | Building Footprint — Corner-Crossing (4-Chunk) | building boundary | Chunks (2,2),(3,2),(2,3),(3,3) | A large 4×4 building centered on the intersection of four chunks must appear in all four chunks as a single unified structure with no repeated facades or missing corners. |  |  | Critical |  |  |
| TC-013 | District Theme Blending — Residential to Commercial | district border | Chunk (0,5) → (1,5) | At the district boundary between a Residential zone and a Commercial zone, buildings within 2 tiles of the border must use the "transition" asset set. No abrupt hard cut between theme palettes. |  |  | Low |  |  |
| TC-014 | District Theme Blending — Industrial to Park | district border | Chunk (4,6) → (4,7) | The boundary between an Industrial district and a Park district must produce a buffer row of appropriate transitional tiles (chain fence, tree line, or service road). No industrial props spawn inside the park tile rows. |  |  | Medium |  |  |
| TC-015 | District Color / Lighting Blending at Night | district border | Chunk (5,5) → (6,5) | Street lighting color temperature transitions smoothly from warm (residential) to cool-white (commercial) across the border. No hard lighting pop at chunk seam when switching from day to night. |  |  | Low |  |  |
| TC-016 | Water Body Continuity — River Crossing Chunk Border | water | Chunk (7,1) → (8,1) | A river 6 tiles wide exits the east edge of chunk (7,1) at tile rows 20–25 and must re-enter chunk (8,1) at the same rows. Flow direction, water animation UV offset, and bank tiles must match with no seam. |  |  | Medium |  |  |
| TC-017 | Water Body — Lake Straddling Multiple Chunks | water | Chunks (2,4),(3,4),(2,5),(3,5) | An irregular lake whose shoreline passes through four chunks must have consistent water surface, shore tile transitions, and no land tiles appearing inside the water body due to chunk mismatch. |  |  | High |  |  |
| TC-018 | Water and Road Intersection at Chunk Border — Bridge | water + road | Chunk (5,2) → (6,2) | A road bridge over a river is positioned such that the bridge midpoint lies on the chunk border. Both bridge deck halves must connect, railing props align, and the underlying water tiles continue correctly beneath both halves. |  |  | High |  |  |
| TC-019 | Combined Road + Rail + District Border at Same Edge | road + rail | Chunk (3,1) → (4,1) | A chunk border simultaneously carries a road, a rail line, and a district theme change. All three must stitch independently without any one system corrupting another (e.g., rail tiles not overwriting road tiles). |  |  | Critical |  |  |
| TC-020 | Null Neighbor Chunk — Graceful Edge Handling | road | Chunk (9,9) → null | A chunk at the world boundary with no neighbor must correctly terminate all outgoing roads, rails, and water without generating errors, exposed stubs, or calls to a null chunk reference. |  |  | Critical |  |  |

## Summary Dashboard

*QA Summary Dashboard*

| Status | Count | % of Total |
| --- | --- | --- |
| Total Test Cases |  |  |
| Passed |  |  |
| Failed |  |  |
| Blocked |  |  |
| N/A |  |  |
| Untested (blank) |  |  |
| Test Cases by Edge Type |  |  |
| Edge Type | Count | % of Total |
| road |  |  |
| rail |  |  |
| building boundary |  |  |
| district border |  |  |
| water |  |  |
| water + road |  |  |
| road + rail |  |  |
| Test Cases by Severity |  |  |
| Severity | Count | % of Total |
| Critical |  |  |
| High |  |  |
| Medium |  |  |
| Low |  |  |

## Edge Type Reference

*Edge Type Reference — Chunk-Stitching Rules*

| Edge Type | Description | Key Stitching Rules | Tile Overlap Required? | Common Failure Modes |
| --- | --- | --- | --- | --- |
| road | Drivable vehicle paths including streets, highways, and intersections | Lane count, road type, and tile row/column must match exactly at border; markings must mirror | 1-tile read-ahead from neighbor required | Lateral offset, type mismatch, phantom intersections |
| rail | Train tracks including ground, elevated, and underground variants | Track gauge, elevation, and tile row must match; switch states must be serialized cross-chunk | 2-tile read-ahead for elevation ramps | Floating bridge supports, open stubs, switch desync |
| building boundary | Footprints of structures that span more than one chunk | Building ID must be shared; footprint registry must be written before either chunk generates interiors | Full footprint reserved before generation | Seam artifacts, double-claimed tiles, missing roof caps |
| district border | Thematic zone transitions (residential, commercial, industrial, park, etc.) | Transition asset sets must be applied within 2 tiles of border; lighting parameters lerped across border | No tile overlap; border is sampled as gradient | Hard palette cuts, wrong-biome props, lighting pops |
| water | Rivers, lakes, and coastal water bodies | Flow direction, UV offset, and shore tile variant must match; water surface is a continuous mesh | 1-tile read-ahead for shore detection | Seam in water animation, land inside lake, mismatched shore |
| Notes |  |  |  |  |
| Note 1 | All chunk data exchange uses a read-ahead buffer. The required tile overlap depth varies by edge type (see column D). |  |  |  |
| Note 2 | Combined edge scenarios (e.g., road + rail at same chunk border) must process each system's stitching pass independently to avoid tile ownership conflicts. |  |  |  |
| Note 3 | Null-neighbor chunks (world boundary) must gracefully terminate all edge systems without calling into a null chunk reference or leaving open stubs. |  |  |  |
| Note 4 | Building footprint registries are written globally before per-chunk generation begins, ensuring cross-chunk structures are reserved before any tile is placed. |  |  |  |
