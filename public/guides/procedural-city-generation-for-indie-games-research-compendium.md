Procedural City Generation for Indie Games

Research Compendium: Case Studies, GDC Talks, Devlogs & Techniques
for Tile-Based Urban Expansion

Compiled by: Brian Date: July 2026 Audience: Solo Indie Game Developer

## Table of Contents

Executive Summary

Part 1: Foundational Algorithms

1.1 Binary Space Partitioning (BSP)

1.2 Wave Function Collapse (WFC)

1.3 Noise-Based Zoning & Biome Maps

1.4 L-Systems and Shape Grammars

Part 2: Road & Rail Graph Generation

2.1 Road-First vs. Parcel-First Approaches

2.2 Road Hierarchy

2.3 Rail Graph Generation

2.4 Road Intersection Logic

Part 3: Chunk Stitching & Seamless Expansion

3.1 The Boundary Pinning Contract

3.2 Deterministic Chunk Seeds

3.3 Chunk Loading State Machine

3.4 Border Summary Caching

Part 4: District Theming & Visual Coherence

4.1 District System Design

4.2 Density Gradients

4.3 Modular Building Kit Design

4.4 Landmark Placement

4.5 Prop & Clutter Layer

Part 5: Open-Source Tools & Reference Implementations

Part 6: GDC Talks & Key References

6.1 GDC Vault Talks

6.2 Articles, Devlogs & Tutorials

Part 7: Applied Design Guide — The 96×64 Chunk System

7.1 Chunk Anatomy

7.2 Generation Pipeline Sequence

7.3 District Type Reference Table

7.4 Key Pitfalls & How to Avoid Them

Part 8: Quick-Reference Takeaways

Appendix: Bibliography

EXECUTIVE SUMMARY

# Executive Summary

This compendium consolidates research on procedural city generation techniques specifically applicable to indie games built around tile-based chunk expansion systems — with a primary focus on isometric and top-down pixel art urban environments using a 96×64 tile chunk architecture. The document synthesises material from GDC talks, open-source repositories, indie developer devlogs, and procedural generation research articles published through July 2026, providing a single curated reference for a solo developer working without a dedicated tools or art team.

The five key problem areas addressed throughout this compendium are: chunk stitching (generating adjacent chunks that join seamlessly without seams or road dead-ends), road and rail graph generation (producing believable multi-tier transport networks procedurally), district theming (differentiating residential, commercial, industrial, and historic zones through tile palettes, density, and building rules), building placement (filling BSP parcels and WFC-solved cells with context-appropriate structures), and visual coherence (ensuring a city feels designed rather than random through prop layers, landmark anchoring, and transition tiles).

The research draws on four primary algorithmic families — Binary Space Partitioning (BSP), Wave Function Collapse (WFC), noise-based biome mapping, and L-system road graphs — and recommends combining them in a layered pipeline rather than selecting one exclusively. Practical 96×64-specific application notes appear throughout every section, translating general theory into concrete parameters and implementation decisions. A full generation pipeline sequence (Part 7), district reference table, pitfall guide, and 20-point quick-reference takeaway list are included to support immediate practical application.

PART 1

# Part 1: Foundational Algorithms

## 1.1 Binary Space Partitioning (BSP)

BSP is the classic workhorse algorithm for city block layout generation in procedural games. It works by recursively dividing a rectangular space — in this context, a chunk — into progressively smaller rectangular parcels, placing roads at each split line and filling the resulting leaf nodes with buildings, parks, open lots, or other district-appropriate content.

Key properties:

Produces predictable, non-overlapping parcel layouts with guaranteed no-overlap between adjacent buildings

Recursion depth directly controls block granularity: shallow depth (2–3) yields large city blocks, deep recursion (5+) produces small dense parcels and alleyway-scale subdivisions

Road spacing and sidewalk margin widths are configurable independently at each recursion depth level, allowing mixed road hierarchies in a single solve

Operates per-chunk with a deterministic seed derived as Hash(worldSeed, chunkX, chunkY), ensuring reproducibility and enabling save/load and multiplayer synchronisation

Open-source reference: tolyy/unity-chunked-bsp-city-generator on GitHub (MIT licence) — pipeline: Divide chunk → Derive chunk seed → BSP subdivision → Road/sidewalk logic → Park plots → Building zones → Trees/perimeter buildings. Link: github.com/tolyy/unity-chunked-bsp-city-generator

## 1.2 Wave Function Collapse (WFC)

WFC transforms a small hand-authored tile sample into an unbounded stream of tile layouts that respect local adjacency rules throughout. Every cell begins in a superposition of all possible tile types; the algorithm collapses the minimum-entropy cell first (the cell with fewest valid tile candidates), propagates constraints outward in AC-3 style, and repeats until all cells are resolved or a contradiction is detected.

Key properties:

Produces locally coherent output: roads connect to roads, buildings appear only adjacent to roads, corners meet corners — all enforced automatically by the adjacency rule set

Tile adjacency rules encode design intent directly — e.g., "road tile can border intersection tile but not park tile directly"

Backtracking on contradiction: restart the region or fail silently (Townscaper's approach for decorative layers)

Used in shipped games: Bad North, Caves of Qud, Townscaper

For large chunks, generate WFC in bounded sub-regions and stitch borders using pre-collapsed boundary cells as shared constraints

Worst-case propagation cost: O(cells × tiles²) per run — cap cost by running WFC within BSP parcels rather than across the full chunk

For pixel art: author 20–60 tile types with explicit socket/edge labels (N/S/E/W connector types) for deterministic adjacency resolution

Reference implementations: Maxim Gumin's original C# WFC (github.com/mxgmn/WaveFunctionCollapse), unity-wave-function-collapse by mxgmn, Godot WFC addon by MatejJan, saddle-procgen-wfc (Bevy/Rust crate: crates.io/crates/saddle-procgen-wfc)

## 1.3 Noise-Based Zoning & Biome Maps

Multi-octave Perlin or Simplex noise provides the macro structure that governs all downstream algorithmic choices before any tiling algorithm runs. Two independent noise maps — one for density, one for theme — define a complete district system at world scale.

Low-frequency noise layer → large-scale density gradient (dense urban core fading to sparse outskirts)

High-frequency noise layer → local variation within districts (park cluster placement, alleyway pockets, courtyard openings)

Sample noise at (chunkX, chunkY) coordinates → map to a district/biome index via lookup table

Voronoi diagrams with Lloyd's relaxation produce more organic, irregular district boundaries than raw Perlin noise alone

Layer threshold rules on top of noise values: below 0.3 = residential; 0.3–0.6 = commercial; above 0.6 = industrial

Store district definitions as data assets (ScriptableObjects in Unity, Resources in Godot) so designers can iterate without touching generation code

## 1.4 L-Systems and Shape Grammars

Originally invented to model plant growth, L-systems generate convincing road networks and organic spatial structures through iterative rule expansion. A simple axiom "F" (move forward, place road segment) with rewrite rules produces branching road trees. Shape grammars extend this principle to building facades and block subdivision. While less commonly used in pure tile-based games than BSP or WFC, L-systems are particularly effective for generating organic district road patterns — medieval quarter winding streets, radial plaza arrangements, or meandering riverside paths — in contrast to the rectilinear outputs of BSP. Consider L-systems when a district type demands irregularity that BSP cannot produce without significant modification.

PART 2

# Part 2: Road & Rail Graph Generation

## 2.1 Road-First vs. Parcel-First Approaches

Two dominant philosophies govern how road networks are generated in relation to building parcels. Choosing the right approach for each district type is a key design decision.

Road-First Approach (Forsaken: Year One, KymeraGames — IndieDB devlog series, June–July 2026)

Generate a set of reference points distributed across an N×N grid within the chunk

Run pathfinding with geometric constraints to connect the reference points, preventing unrealistic angles and chaotic intersections

Clean up the resulting geometry so all streets connect properly with no dead-end stubs at internal junctions

Place buildings along the road edges after the full road network is established

Result: Organic, believable layouts with natural density gradients and irregular block shapes

Source: indiedb.com/games/forsaken-year-one/news (Parts 1–4)

Parcel-First Approach (BSP)

Recursively subdivide chunk space into rectangular parcels using BSP

Road segments emerge automatically at BSP split lines

Buildings are placed to fill each parcel according to district rules

Result: Structured, grid-feeling layouts better suited to urban cores and industrial zones

## 2.2 Road Hierarchy

Real cities have a clear hierarchy of road types — arterial roads, collector streets, and local lanes. A procedural system should mirror this with three explicit tiers, each with defined roles and generation order.

Primary roads (Tier 1): Connect chunk boundaries to each other. These MUST be placed first and pinned at chunk edges before any BSP or WFC solving. Primary road exit positions are stored in the chunk manifest and inherited by all adjacent chunks.

Secondary roads (Tier 2): Collector streets internal to each chunk, spawned by BSP split lines or by pathfinding between internal reference points. Placed after primary roads are fixed.

Tertiary lanes (Tier 3): Alleyways, pedestrian paths, and driveways. Placed last as connectors between building entrances and secondary roads. (Forsaken: Year One Part 4 demonstrated auto-generated driveway paths from house entrance tiles to the nearest secondary road.)

## 2.3 Rail Graph Generation

Rail networks follow fundamentally different rules from road networks. They cannot turn sharply, must use dedicated station tile types, and typically form loops or spine structures rather than grid-like networks. Rail must be routed before BSP subdivision runs so that a dedicated right-of-way (ROW) corridor can be reserved.

Define a set of "anchor" tile positions at chunk boundaries for rail entry and exit points — analogous to road boundary pinning

Connect anchors using minimum-curvature A* or Bézier-guided pathfinding constrained to 0°/45°/90° angles (the Mini Metro / MetroMap.io approach)

Place station building tiles at anchor intersections or at points of high population density sampled from the density noise map

Rail segments crossing water tiles or crossing district boundaries incur additional pathfinding cost (implement via weighted graph edges)

Reference: championswimmer/metromap-game (GitHub) — seeded RNG maps, 0°/45°/90° constrained line placement, catchment area population density. Link: github.com/championswimmer/metromap-game

## 2.4 Road Intersection Logic

Road intersections are the most visually demanding element to get right in a tile-based city system. Incorrect intersection tiles break visual coherence more visibly than almost any other generation artefact.

T-intersections and 4-way crossings require dedicated tile sprite variants. A complete intersection tile set requires at minimum 6 distinct intersection types (4-way cross, T-north, T-south, T-east, T-west, dead-end cap)

Dead-end caps need their own tile sprite distinct from regular road end tiles

Use socket-based adjacency labelling (label each tile edge N/S/E/W with a typed connector) so the WFC solver or rule system auto-selects the correct intersection tile variant without manual placement

For isometric pixel art: intersection tiles require diagonal-aware sprites to handle the 2.5D overlap. Render all road tiles in painter's algorithm order (back-to-front, sorted by Y position) to maintain correct depth overlap

PART 3

# Part 3: Chunk Stitching & Seamless Expansion

## 3.1 The Boundary Pinning Contract

The boundary pinning contract is the single most important concept for seamless chunk expansion in a tile-based open world. Without it, roads dead-end at chunk boundaries, tile palettes clash, and buildings overlap chunk edges.

Before solving the interior of any new chunk, a "boundary contract" must be defined — a fixed set of tile types that are permitted at each edge of the chunk. When a new adjacent chunk is generated:

Query the existing neighbour chunk's boundary tiles (retrieved from the neighbour's stored chunk manifest)

Pre-collapse (pin) the new chunk's facing border cells to tile types compatible with the neighbour's boundary tiles

Solve the new chunk's interior freely, subject to the constraints imposed by the pinned border

Accept the tradeoff: reduced tile variety within the 1–2 tile stitching margin, in exchange for seamless traversal everywhere else

Source: PulseGeek — "Tilemap-Based Level Generation: Grids with Personality" (2026); "Terrain Stitching and Chunking: Seamless Streaming" (2026). pulsegeek.dev

## 3.2 Deterministic Chunk Seeds

Reproducibility is not optional in a chunk-based world — it is the foundational guarantee that makes the system debuggable, save-compatible, and multiplayer-syncable.

Derive each chunk's seed deterministically: chunkSeed = Hash(worldSeed, chunkX, chunkY)

Use a high-quality, stable hash function (xxHash or FNV-1a recommended) — avoid .NET's built-in Random, which is not guaranteed to produce consistent output across runtime versions

Same seed + same algorithm version = same chunk output, always — this is the contract your save system, multiplayer sync, and debug repro workflow all depend on

Store the world seed AND the generation algorithm version in every save file; a version bump gracefully invalidates old chunks and triggers regeneration

Reference: tolyy/unity-chunked-bsp-city-generator; PulseGeek — "Deterministic Terrain Generation at Scale" (2026)

## 3.3 Chunk Loading State Machine

Managing chunk lifecycle with an explicit per-chunk state machine prevents frame stalls, handles cancellation correctly, and keeps memory usage bounded. This architecture matches the approach described in the GDC 2017 talk on No Man's Sky's continuous world generation.

Issue generation on background threads; apply results to the scene on the main thread within a bounded per-frame time window

Maintain a priority queue ordered by camera distance — load nearest chunks first

Cancel pending Requested → Generating transitions if the camera moves away before generation begins

Display placeholder tiles (empty lot / fog-of-war) while chunks generate — never stall the main thread

GDC Reference: Innes McKendrick, "Continuous World Generation in No Man's Sky," GDC 2017. gdcvault.com/play/1024265/

## 3.4 Border Summary Caching

For worlds with many hundreds of generated chunks, precomputing lightweight "border summaries" enables fast chunk negotiation without loading full chunk tile arrays into memory.

A border summary is a compact array of (tile_type, road_exits, district_id) for each cell on each of the chunk's 4 edges

Store border summaries in a separate, smaller data file from the full chunk tile data — load border summaries first on startup; they are cheap to keep resident in a large LRU cache

Full chunk tile data unloads when the chunk exits the resident set; border summaries remain in cache far longer

This pattern keeps per-frame stitch negotiation fast and frame times smooth while preserving visual continuity at all seams

PART 4

# Part 4: District Theming & Visual Coherence

## 4.1 District System Design

Districts are the primary tool for making a procedurally generated city feel real rather than random. Each district type is a self-contained data asset that defines all downstream generation parameters for chunks assigned to it.

Each district definition contains:

Tile palette: A curated subset of tiles permitted in that district's BSP/WFC solve (e.g., residential uses warm brick textures; industrial uses corrugated metal and concrete)

Building footprint rules: Minimum and maximum building size per tile, allowed footprint shapes (1×1, 1×2, 2×2, L-shape, irregular)

Density parameters: BSP recursion depth, road width tier assignment, park and open lot frequency

Landmark budget: Number of special landmark buildings permitted per chunk (churches, factories, train stations, plazas)

Reference: Red Brix Wall — "Isometric City Builder Art: Modular Buildings, Layout & Lighting" (2026). Zone differentiation by silhouette height profile and palette:

## 4.2 Density Gradients

Real cities have readable density gradients: dense urban cores transition through mid-density neighbourhoods to sparse outskirts. Generating this gradient procedurally is essential for player orientation and city believability.

The Forsaken: Year One Part 3 devlog implemented this gradient with a concentric dual-grid system:

Establish a single "city centre" reference point for the settlement

Downtown grid: Tightly clustered road reference points → dense intersections → packed building footprints → multi-storey commercial buildings

Outskirts grid: Long distances between road reference points → winding roads → large residential lots → single-storey buildings

Building type and height are selected by distance from the centre point — close proximity selects downtown structure types, greater distance selects suburban types

This creates readable density hierarchies that match player spatial expectations developed from real-world cities

## 4.3 Modular Building Kit Design

For a pixel art city builder, a modular building kit is the foundational art investment that enables visual coherence at scale without requiring unique art for every building.

Define three base footprints that all buildings snap to: 1×1, 1×2, and 2×2 tiles

Create multiple variants per footprint through permutation of: roof type, facade material, window count, and prop overlays

A 6-asset base kit with 2–3 variants per variable yields 60+ visually distinct buildings — sufficient for a full city without asset repetition fatigue

Establish a shared shadow/light source direction before authoring any art — apply consistent drop shadows under eaves and overhangs throughout the entire kit

Use subtle colour-shifted outlines (a darker hue of the adjacent colour, not pure #000000 black) for crisp, readable pixel art edges at all zoom levels

Reference: SLYNYRD Pixelblog #51 — "City Builder" (top-down pixel art city builder tutorial and asset pack). slynyrd.com/blog/2019/2/12/pixelblog-number-51-city-builder

## 4.4 Landmark Placement

Landmarks anchor a district visually and give players readable navigation cues — essential in procedurally generated cities where players cannot rely on memorised hand-crafted layouts.

Place landmarks at visually prominent positions: chunk corners, primary road intersections, or peaks in the density noise map

Assign each district a "landmark budget" — e.g., 1 landmark per chunk for residential, 2 for commercial, 0 for pure industrial

Landmark tiles use special WFC constraints that suppress adjacent buildings within a tile radius, ensuring the landmark silhouette reads clearly against the skyline

Example landmark placements: train stations at rail graph nodes, covered markets at road intersection centres, parks and plazas at low-density zones near water tiles

Source: PulseGeek — "Procedural World Generation for Open-World Games" (2026) — AI-driven POI placement heuristics apply directly to landmark budget distribution

## 4.5 Prop & Clutter Layer

The prop layer is what separates a dead-feeling procedural city from a lived-in one. A three-tier prop system ensures all readability and atmosphere needs are covered without ad hoc prop placement logic.

(Derived from Forsaken: Year One Part 4 devlog — KymeraGames, July 2026)

Tier 1 — Randomised scatter: Loose trash, abandoned vehicles, road barriers. Placed via Poisson disk sampling to avoid unwanted clustering and ensure readable inter-prop spacing. Physics-based random rotation angles simulate knockover and decay.

Tier 2 — Linear roadside props: Streetlights, telephone poles, traffic signs. Placed at regular intervals along road tiles (every N tiles, where N is a per-district parameter). Consistent intervals signal infrastructure maintenance level.

Tier 3 — Context-specific props: Mailboxes, garbage cans, potted plants, welcome mats. Anchored near building entrance tiles using strict logical rules (only adjacent to a door tile type). These props carry the most narrative weight per tile.

PART 5

# Part 5: Open-Source Tools & Reference Implementations

The table below catalogues the most directly applicable open-source projects identified during this research period. All are suitable for study and adaptation by a solo indie developer. Licences were verified at time of research (July 2026).

PART 6

# Part 6: GDC Talks & Key References

## 6.1 GDC Vault Talks

## 6.2 Articles, Devlogs & Tutorials

PART 7

# Part 7: Applied Design Guide — The 96×64 Chunk System

## 7.1 Chunk Anatomy

At 96 tiles wide × 64 tiles tall, each chunk divides into four named zones that must be respected by every step of the generation pipeline. The zones are arranged concentrically, with tighter constraints at the edges and maximum design freedom in the core.

## 7.2 Generation Pipeline Sequence

The following 10-step pipeline defines the complete generation sequence for a single 96×64 chunk. Steps must be executed in order — steps marked with a dependency arrow (→) must complete before the next step begins.

## 7.3 District Type Reference Table

## 7.4 Key Pitfalls & How to Avoid Them

PART 8

# Part 8: Quick-Reference Takeaways

Twenty distilled, actionable insights from this compendium — one key decision or technique per point.

Use Hash(worldSeed, chunkX, chunkY) for per-chunk deterministic seeds — the same seed always produces the same chunk. Use xxHash or FNV-1a, not .NET's built-in Random.

BSP is the fastest and most predictable macro-structure algorithm for city block layout. Run it at depth 3–5 depending on desired density, driven by the noise pre-pass value.

WFC is best used within BSP leaf parcels for micro-detail, not across entire 96×64 chunks — this keeps per-solve propagation cost manageable and reduces contradiction frequency.

The boundary pinning contract — pre-collapsing the 2-tile margin from neighbour chunk manifests — is the single most important technique for seamless chunk stitching. Everything else depends on it.

Primary road exit positions must be deterministic and derived from chunk coordinates alone, so that neighbouring chunks can predict them without needing to load each other first.

Sample two independent noise maps (density + theme) at chunk-level granularity, not tile-level. This keeps district assignment chunk-coherent and avoids micro-variation in district boundaries.

Voronoi + Lloyd's relaxation produces more organic, believable district boundaries than raw Perlin noise — worth the additional implementation cost if organic-feeling cities are a design goal.

Build an explicit chunk state machine (Unloaded → Requested → Generating → Resident → Visible → Unloading) and drive transitions from camera distance. Cancel stale generation requests before they begin.

Rail lines must be placed before BSP subdivision runs — reserve the 2-tile ROW corridor at chunk edges in Step 1 so BSP treats it as inviolable off-limits space throughout.

Implement three road tiers: primary (4 tiles wide, chunk-crossing), secondary (2 tiles, BSP-derived), and tertiary (1 tile, connectors and driveways). Enforce these widths consistently across all district types.

Concentric dual-grid generation — tight downtown reference point grid plus loose outskirts reference point grid — is an elegant, low-cost technique for creating believable organic density gradients within a chunk.

Drive BSP depth from the density noise value sampled in the World-Level Pre-Pass. Shallow depth for low-density residential, deeper recursion for high-density commercial and industrial.

Implement all three prop tiers: randomised scatter (Poisson disk sampling), linear roadside (every N tiles along road edges), and context-specific (entrance-anchored). All three together cover all atmosphere and readability needs.

Zone differentiation in pixel art must be achieved through silhouette height profile AND colour palette — palette alone is insufficient. Players read city districts primarily through silhouette at a distance.

Store border summaries separately from full chunk tile data in a large LRU cache. They are cheap to keep resident and enable fast chunk stitch negotiation without loading full tile arrays.

Townscaper's "silent failure" WFC mode — skipping contradictions rather than restarting the entire solve — is the correct approach for decorative tile layers where strict correctness is not required.

Define explicit transition tile sets at district boundaries to avoid hard visual cuts between palettes. This is the primary function of the 2-tile stitching margin beyond road alignment.

Place landmark buildings in the largest BSP leaf node per chunk, suppress adjacent buildings in a tile radius, and position at primary road intersections for maximum player navigational visibility.

Author 20–60 WFC tile types with explicit socket labels per edge direction (N/S/E/W). Start small (20 tiles) and expand the tileset incrementally as visual gaps appear during playtesting.

Run a reachability validation (flood fill) after every chunk generation to verify all required tiles are accessible from the road network. Reject the chunk and reseed if connectivity validation fails.

APPENDIX

# Appendix: Bibliography

All references listed below were identified and accessed during research compiled in July 2026. Links were valid at time of research.

1. McKendrick, I. (2017). Continuous World Generation in 'No Man's Sky'. GDC Vault. https://gdcvault.com/play/1024265/

2. Murray, S. (2017). Building Worlds Using Math(s). GDC Vault. https://gdcvault.com/

3. Murphy, C. & Logut, A. (2026). Developing Large Procedural Systems with Low Friction and Fast Generation. Epic Games / GDC 2026. https://gdcvault.com/

4. KymeraGames. (2026). Forsaken: Year One — Procedural Village Generation Devlog Series (Parts 1–4). IndieDB. https://www.indiedb.com/games/forsaken-year-one/news

5. Stålberg, O. Townscaper. (Analysis) Game Developer. https://www.gamedeveloper.com/design/how-townscaper-works-a-story-four-games-in-the-making

6. Gumin, M. (2016). WaveFunctionCollapse. GitHub. https://github.com/mxgmn/WaveFunctionCollapse

7. Dolgun, M. A. (2025). unity-chunked-bsp-city-generator. GitHub. https://github.com/tolyy/unity-chunked-bsp-city-generator

8. Basinity. (2023). CitySimulator. GitHub. https://github.com/Basinity/CitySimulator

9. SLYNYRD. (2019). Pixelblog #51 — City Builder. https://www.slynyrd.com/blog/2019/2/12/pixelblog-number-51-city-builder

10. Red Brix Wall. (2026). Isometric City Builder Art: Modular Buildings, Layout & Lighting. https://redbrixwall.com/

11. PulseGeek. (2026). Tilemap-Based Level Generation: Grids with Personality. https://pulsegeek.dev/

12. PulseGeek. (2026). Terrain Stitching and Chunking: Seamless Streaming. https://pulsegeek.dev/

13. PulseGeek. (2026). Deterministic Terrain Generation at Scale. https://pulsegeek.dev/

14. StraySpark. (2026). Procedural World Generation for Open-World Games. https://strayspark.dev/

15. Lumitree Blog. (2026). Wave Function Collapse: How to Generate Infinite Tile-Based Worlds With Code. https://lumitree.com/

16. BSWEN. (2026). How to Implement Procedural Generation for Tile-Based Games. https://bswen.com/

17. Gamedō. (2026). Procedural Generation for Indie Games: 5 Practical Algorithms. https://gamedo.dev/

18. Yiu, F. et al. (2025). A Markovian Framing of WaveFunctionCollapse for Procedurally Generating Aesthetically Complex Environments. arXiv. https://arxiv.org/

19. Beneking102. (2025). bene-proggen-maps. GitHub. https://github.com/Beneking102/bene-proggen-maps

20. championswimmer. (2026). metromap-game. GitHub. https://github.com/championswimmer/metromap-game

Compiled July 2026  |  For indie game development reference  |  All links valid at time of research

| 96×64 Application Note — BSP At 96×64 tiles per chunk, a BSP recursion depth of 3–4 yields city blocks of roughly 12–24 tiles wide — ideal for low-to-mid density urban footprints. BSP depth 5 pushes into high-density alleyway territory, appropriate for commercial cores. Always exclude the 2-tile stitching margin and any primary road corridors from the BSP solve area — BSP should operate only on the interior district core. |

| --- |

| 96×64 Application Note — WFC Running WFC across a full 96×64 chunk is computationally expensive and unnecessary. Best practice is to run BSP first for macro structure, then run WFC within each individual BSP parcel for micro-detail. Pre-collapse a 2-tile border margin from neighbouring chunks before solving the interior of any new chunk, ensuring road and pavement edges stitch cleanly across the chunk boundary. |

| --- |

| 96×64 Application Note — Noise Zoning Sample the noise at chunk-level granularity, not tile-level, to keep district themes chunk-coherent and avoid noisy micro-variation in district assignment. A 3×3 chunk neighbourhood lookup before generating a new chunk enables gradient blending at district transitions — e.g., a commercial chunk adjacent to a residential chunk can receive a transitional tile palette in its stitching margin rather than a hard visual edge cut. |

| --- |

| 96×64 Application Note — Road Generation Strategy Use Road-First for organic district chunks (residential, historical old town). Use Parcel-First (BSP) for grid chunks (industrial, downtown commercial). The chunk's district type — determined by your noise biome map — drives which road generator fires for that chunk. A single world can use both approaches across different chunk types. |

| --- |

| Visual Tip — Road Tier Differentiation Differentiate road tiers by tile width in pixel art: Primary = 4 tiles wide , Secondary = 2 tiles wide , Tertiary = 1 tile wide . This creates immediately readable visual hierarchy at a glance, even at low zoom levels. Consistent width conventions also make WFC adjacency rules simpler — each tier uses its own socket label family. |

| --- |

| 96×64 Application Note — Rail ROW Reserve a 2-tile-wide corridor along chunk edges as the rail right-of-way. When a new chunk expands adjacently, rail entry/exit tile positions are pre-agreed by the same boundary pinning system used for roads. Rail inherits the cross-chunk contract automatically — no additional stitching logic is required beyond what is already implemented for road stitching. |

| --- |

| 96×64 Application Note — Stitching Zone Reserve a 2-tile margin on all 4 edges of each 96×64 chunk as the stitching zone. Store primary road tile positions at chunk N/S/E/W edges in a lightweight "chunk manifest" (JSON or compact binary). When generating any new chunk, read the manifests of up to 4 adjacent neighbours before beginning BSP or WFC solving. The manifest read is cheap — it contains only boundary data, not full tile arrays. |

| --- |

| State | Description | Transition Trigger |

| --- | --- | --- |

| Unloaded | Chunk not in memory; manifest may or may not exist on disk | Camera approaches within load radius |

| Requested | Generation queued in priority queue; waiting for background thread | Scheduled by priority queue consumer |

| Generating | BSP/WFC/placement pipeline running on background thread | Background thread picks up job |

| Resident | Tile data in memory; not yet rendered to screen | Generation completes; main thread applies data |

| Visible | Chunk actively rendered and streamed to GPU | Camera enters visibility range |

| Unloading | Tile data being evicted; manifest written if dirty | Camera exits unload radius + LRU eviction |

| 96×64 Application Note — Resident Set & Budget At 96×64 tiles per chunk, a 3×3 neighbourhood (9 chunks = 55,296 total tiles) is a comfortable resident set for most target hardware. Pre-generate a 5×5 ring asynchronously while the player is stationary at the centre. Target a generation budget of under 8ms per chunk on a background thread. Exceeded budgets indicate the pipeline needs subdivision (split WFC parcel solves across multiple frames). |

| --- |

| District | Palette | Roof Style | Storey Range | Road Character |

| --- | --- | --- | --- | --- |

| Residential | Warm amber/brick | Pitched | 1–2 storeys | Winding secondary lanes |

| Commercial | Neutral grey/glass | Flat | 2–4 storeys | Grid primary + secondary |

| Industrial | Cool grey/rust | Sawtooth or flat | 1–3 storeys (large footprint) | Wide primary roads |

| Historic/Old Town | Stone/timber | Mixed pitched | 1–3 storeys | Winding tertiary lanes |

| 96×64 Application Note — District Density per Chunk A single 96×64 chunk can accommodate a maximum of 2–3 district types if noise splits the chunk into sub-zones. Avoid placing more than 3 district boundaries per chunk — beyond this, the result feels incoherent regardless of transition tile quality. When noise places a chunk near a district boundary, assign it to the dominant district type and handle blending purely through transition tile sets in the stitching margin. |

| --- |

| Isometric Rendering Note For isometric pixel art: render all props in painter's algorithm order (Y-sort by world position) to maintain correct depth coherence. Props that straddle tile boundaries — e.g., a tall streetlight pole spanning two tile heights — require a dedicated sorting anchor point distinct from the tile origin. |

| --- |

| Tool / Project | Algorithm | Engine / Language | Licence | Best For | Link |

| --- | --- | --- | --- | --- | --- |

| tolyy/unity-chunked-bsp-city-generator | Chunked BSP + deterministic seeds | Unity (C#) | MIT | Chunk-based city with roads, parks, and buildings | GitHub |

| Basinity/CitySimulator | WFC + FSM agents | Unity (C#) | Open | WFC city layout with pedestrian AI simulation | GitHub |

| Beneking102/bene-proggen-maps | FBM noise + BSP + zone pipeline | Blender Python | Open | Full city pipeline: zones → streets → buildings → props | GitHub |

| saddle-procgen-wfc | WFC / Model Synthesis | Bevy / Rust | Open | Deterministic WFC for hex, square, and voxel grids | crates.io |

| championswimmer/metromap-game | Seeded RNG + constrained line routing | TypeScript | Open | Rail/metro graph generation on procedural maps | GitHub |

| Fancookie/bsp-dungeon-generator | BSP with step-by-step visualisation | TypeScript / Canvas | Open | Learning BSP via animated playback — ideal for debugging | GitHub |

| mxgmn/WaveFunctionCollapse | WFC reference implementation | C# | MIT | The canonical WFC implementation — primary algorithm reference | GitHub |

| Talk — "Continuous World Generation in No Man's Sky" Speaker: Innes McKendrick, Hello Games  |  Conference: GDC 2017 •  Covers the full technical architecture for continuous chunk streaming: voxel generation, polygonisation, texturing, population, and simulation •  Key insight: explicit chunk state machine (Unloaded → Requested → Generating → Resident → Visible) with async I/O and camera-distance priority queue ordering •  Directly applicable to streaming city chunks as the player expands the procedural map outward Access: gdcvault.com/play/1024265/ (free tier: approximately 30% of content available without subscription) |

| --- | --- |

| Talk — "Building Worlds Using Math(s)" Speaker: Sean Murray, Hello Games  |  Conference: GDC 2017 •  Demonstrates programmer-generated worlds using pure mathematics without requiring hand-placed artistic input at scale •  Examines infinite environment generation feasibility for a small team •  Key insight: parameter-driven art direction rather than hand-placed content — the generator defines the aesthetic space, not individual assets Access: GDC Vault — search "Building Worlds Using Math" at gdcvault.com |

| --- | --- |

| Talk — "Developing Large Procedural Systems with Low Friction and Fast Generation" Speakers: Chris Murphy & Adrien Logut, Epic Games  |  Conference: GDC 2026 •  Introduces the PCG Biome Core system for managing multiple interdependent procedural elements in large worlds •  Covers runtime vs. static serialisation strategies and source control conflict avoidance using biome-level data partitioning •  Performance techniques: GPU-accelerated instancing, distance-based LOD, and smart regeneration caching to avoid redundant work Access: gdcvault.com |

| --- | --- |

| Title | Author / Source | Key Takeaways | Link |

| --- | --- | --- | --- |

| Forsaken: Year One — Procedural Village Generation Series (Parts 1–4) | KymeraGames, IndieDB (June–July 2026) | Part 1: static → procedural motivation. Part 2: road placement via constrained pathfinding. Part 3: concentric dual-grid density gradient. Part 4: three-tier prop system, physics rotation, auto driveways. | IndieDB |

| How Townscaper Works | Game Developer (analysis of Oskar Stålberg's work) | Aperiodic irregular relaxed quadrilateral grid (inspired by Amit Patel / Red Blob Games). WFC from Bad North applied to determine available building tiles. Silent failure mode for WFC contradictions. Performance note: larger structures trigger longer WFC propagation cascades. | Game Developer |

| Wave Function Collapse: How to Generate Infinite Tile-Based Worlds With Code | Lumitree Blog (April 2026) | 8 live JavaScript/Canvas WFC visualisations (terrain, city blocks, platformer levels, pipe networks). Practical socket/edge labelling implementation guide. | Lumitree |

| Tilemap-Based Level Generation: Grids with Personality | PulseGeek (2026) | Shape graph approach (macro topology before tile solving). Boundary pinning contract for seamless chunk stitching. Validation via reachability flood fill, pacing metrics, filler tile detection. | PulseGeek |

| Procedural World Generation for Open-World Games | StraySpark (2026) | Biome map generation using Voronoi + Lloyd's relaxation. Data-asset-driven biome definitions. POI placement heuristics (sight lines, spacing, biome affinity). | StraySpark |

| SLYNYRD Pixelblog #51 — City Builder | SLYNYRD (2019) | Top-down pixel art city builder asset creation: houses, schools, offices, roads, terrain tiles. 16×16 px grid discipline, drop shadow application, outline colouring technique. City Builder Asset Pack available. | SLYNYRD |

| Isometric City Builder Art: Modular Buildings, Layout & Lighting | Red Brix Wall (2026) | Lock theme/scale/camera before starting art — all downstream choices depend on this. Zone differentiation by silhouette, palette, and texture complexity. Mobile: GPU instancing, texture atlassing, LOD ladders. | Red Brix Wall |

| Procedural Generation for Indie Games: 5 Practical Algorithms | Gamedō (2026) | Side-by-side comparison of Noise, BSP, WFC, Drunkard's Walk, and L-Systems with pseudocode. Recommended mixing approach: noise for macro terrain → BSP/WFC for areas → room templates for hand-crafted beats. | Gamedō |

| How to Implement Procedural Generation for Tile-Based Games | BSWEN (February 2026) | Full pipeline with TypeScript code samples: terrain → buildings → A* road routing → chunk streaming. Corner-height terrain rendering for isometric projection. Chunk class keyed by "chunkX,chunkY" string. | BSWEN |

| Zone | Tile Coverage | Function | Constraints |

| --- | --- | --- | --- |

| Stitching Margin | 2 tiles on all 4 edges (perimeter band) | Pre-pinned boundary tiles — road exits, pavement edges, district palette transitions. Stored in chunk manifest. | Never place buildings here. Tile types restricted to those compatible with neighbour manifests. Solved before BSP begins. |

| Primary Road Corridor | Variable width; crosses full chunk N→S or E→W | 4-tile-wide main road. Always present if district connects to neighbours. Placed before BSP runs. | Inviolable — BSP and WFC cannot overwrite primary road tiles. Corridor width reserved as off-limits during BSP subdivision. |

| District Core | Interior area after subtracting margins and primary road | Primary BSP/WFC solve zone. Subdivided by district type into building parcels. | BSP depth driven by density noise value. WFC tile palette restricted to district's assigned palette. |

| Landmark Zone | 1–2 designated spots per chunk (largest BSP parcels) | Reserved after BSP solves. Largest parcel receives landmark building. Landmark suppresses adjacent buildings in a radius. | Only 1 landmark per chunk for residential; up to 2 for commercial. Industrial gets 0 unless rail node. |

| CHUNK ANATOMY — 96×64 TILE LAYOUT (schematic, not to scale)  ┌──────────────────────────────────────────────────────────┐ │  STITCHING MARGIN (2-tile perimeter band — all 4 edges)  │ │  ┌────────────────────────────────────────────────────┐  │ │  │  PRIMARY ROAD CORRIDOR (4-tile wide, N→S or E→W)  │  │ │  │  ┌──────────────────┐  ┌──────────────────────┐   │  │ │  │  │  DISTRICT CORE   │  │   DISTRICT CORE      │   │  │ │  │  │  (BSP + WFC)     │  │   (BSP + WFC)        │   │  │ │  │  │                  │  │  [LANDMARK ZONE]      │   │  │ │  │  │                  │  │                      │   │  │ │  │  └──────────────────┘  └──────────────────────┘   │  │ │  └────────────────────────────────────────────────────┘  │ └──────────────────────────────────────────────────────────┘ |

| --- |

| Step | Phase | Description |

| --- | --- | --- |

| STEP 1 | World-Level Pre-Pass | Sample noise at (chunkX, chunkY) to determine: district type, density level, primary road exit flags (N/S/E/W), rail entry/exit flags, and landmark budget. All downstream parameters derive from this step. |

| STEP 2 | Neighbour Query | Read chunk manifests of up to 4 adjacent chunks (if they exist). Extract their boundary tile types for each shared edge. Store locally for the pinning step. |

| STEP 3 | Boundary Pinning | Lock the 2-tile stitching margin on all 4 edges to tiles compatible with neighbour boundary tile types. Lock primary road exit tile positions at chunk edges as determined by Step 1 flags. |

| STEP 4 | Primary Road Placement | Draw 4-tile-wide primary road corridors connecting the exit points determined in Step 1 and pinned in Step 3. Mark corridor tiles as inviolable — no subsequent step may overwrite them. |

| STEP 5 | BSP Subdivision | Run BSP at depth 3–5 (driven by density noise from Step 1) on the remaining interior area, excluding the primary road corridor and the 2-tile stitching margin. BSP split lines become secondary road positions. |

| STEP 6 | WFC Detail Solve | Within each BSP leaf parcel, run WFC using the district tile palette. Pre-collapse parcel edges adjacent to secondary roads to pavement/sidewalk tiles before solving the parcel interior. |

| STEP 7 | Building Placement | Fill each BSP leaf node with buildings from the district's building pool. Select footprint size to fit parcel dimensions. Place the landmark building in the largest parcel. |

| STEP 8 | Rail Placement | (Only if rail flags set in Step 1.) Route rail using constrained pathfinding (0°/45°/90°) from entry to exit points through the 2-tile ROW corridor reserved at chunk edges. Place station tile at high-density intersection. |

| STEP 9 | Prop Layer | Scatter layer: Poisson disk sampling for debris and vehicles. Linear layer: streetlights every 8 tiles along road edges. Context layer: doorstep props at each building entrance tile. |

| STEP 10 | Manifest Write | Write chunk manifest: boundary tile types for all 4 edges × full edge length, road exit positions, district ID, landmark positions, rail exit positions. Store compressed. Border summary extracted and cached separately. |

| District Type | Noise Threshold | BSP Depth | Road Width | Building Footprints | Palette Hint | Landmark Type |

| --- | --- | --- | --- | --- | --- | --- |

| Residential | 0.0 – 0.30 | 3 | 2-tile secondary | 1×1, 1×2 | Warm amber / brick | Church, Park, School |

| Commercial | 0.30 – 0.55 | 4 | 2-tile secondary + 4-tile primary | 1×2, 2×2 | Neutral grey / glass | Market Hall, Hotel, Bank |

| Mixed Use | 0.45 – 0.60 | 4 | 2-tile secondary | 1×1, 1×2, 2×2 | Warm + neutral blend | Corner Store, Cafe |

| Industrial | 0.60 – 0.80 | 3 (large parcels) | 4-tile primary only | 2×2, 2×4, L-shape | Cool grey / rust | Factory, Warehouse, Silo |

| Historic / Old Town | 0.15 – 0.35 (special flag) | 2 (organic roads) | 1-tile tertiary lanes | 1×1, irregular | Stone / timber | Cathedral, Guild Hall, Fountain |

| Transport Hub | Any (rail node flag) | 2 | 4-tile primary + rail ROW | 2×4, 4×4 | Concrete / steel | Train Station, Bus Depot |

| Pitfall 1: Roads that dead-end at chunk boundaries Cause: Chunk generated without reading neighbour manifests — road exits do not align across the boundary. Fix: Always query neighbour manifests (Step 2) before generation begins. Apply the boundary pinning contract (Step 3). Make primary road exit tile positions part of the chunk seed derivation (Step 1) so they are predictable even before neighbouring chunks have been generated. |

| --- |

| Pitfall 2: Style drift across district transitions Cause: WFC tile palettes have zero overlap between adjacent districts, creating hard visual cuts at chunk boundaries that look like obvious seams. Fix: Define explicit transition tile sets for use within the 2-tile stitching margin — tiles that blend both adjacent district palettes. Accept impure palette in the stitching zone in exchange for visual continuity. Never enforce strict palette rules within 2 tiles of any district boundary. |

| --- |

| Pitfall 3: WFC contradiction cascades on large chunks Cause: Overly constrained tile adjacency rules, particularly at road + building + park triple-junction cells, cause WFC to fail and restart repeatedly. Fix: Run WFC per BSP parcel, not across the whole chunk. Allow silent failure (skip rather than restart) for decorative tiles (Townscaper's approach). Add "wildcard" filler tiles with permissive adjacency rules to any palette, providing a recovery path out of contradiction states. |

| --- |

| Pitfall 4: Uniform building density makes all districts look the same Cause: BSP depth is a constant value regardless of the district type or the density noise value for that chunk. Fix: Drive BSP depth directly from the noise-sampled density value determined in Step 1. Use the concentric dual-grid approach (Forsaken: Year One, Part 3) for organic density gradients — tight reference point grid for dense areas, loose grid for sparse areas — rather than relying solely on BSP depth adjustment. |

| --- |

| Pitfall 5: Performance spikes when generating adjacent chunks simultaneously Cause: Multiple chunk generation jobs fired simultaneously on the same frame as the camera moves to a new area. Fix: Stagger chunk generation using a priority queue with a strict per-frame time budget (e.g., 4ms/frame for background generation). Use async/threaded generation and apply results to the scene on the following frame. Never generate more than one chunk per frame on the main thread. |

| --- |

| Pitfall 6: Rail lines that ignore terrain and cut through buildings Cause: Rail routing runs after the building placement step (Step 7), so there is no reserved corridor for the rail ROW and it conflicts with already-placed structures. Fix: Route rail BEFORE BSP subdivision (Step 5). Reserve the 2-tile ROW corridor at chunk edges in Step 1 (Pre-Pass) and treat it as off-limits during BSP solving. Rail placement (Step 8) then has an unobstructed corridor guaranteed by construction. |

| --- |