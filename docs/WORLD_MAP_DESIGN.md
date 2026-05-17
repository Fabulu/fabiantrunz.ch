# World Map Design — fabiantrunz.ch Driving Game

## Overview

A hand-crafted island (~200x200 units) with 6 distinct zones arranged around a central hilltop. The gallery box sits on the hilltop. After the box-falls-away transition, the car spawns on the hilltop and dirt paths radiate outward to each zone. Each zone contains a project building. From the hilltop, you can always see 2-3 landmarks.

## Map Layout

```
              N
              |
    [FOREST]  |  [MEADOW]
    dark pines |  bright green, flowers
    Vortex Lab |  LunaLog Observatory
       \      |      /
        \     |     /
    -----[HILLTOP]------
        / CENTER  \
       /    |      \
      /     |       \
[CANYON]  [PATHS]  [MOUNTAIN TEA LANDSCAPE]
brown cliffs  |   craggy peaks, arched bridge
boulders     |   tea bush rows, mist
SE4x Tower  |   ReadZen Temple + Open Zen Pavilion
      \     |     /
       \    |    /
        [LAKE SHORE]
        blue water, beach
        WhoGoesFirst Plaza
```

## Zone Details

### 1. HILLTOP (center, x=0 z=0)
- Elevated plateau, ~8 units high, flat on top
- Gallery box sits here; car spawns here after transition
- Grassy green ground
- Gentle slopes down in all directions
- Dirt paths radiate outward like spokes

### 2. MOUNTAIN TEA LANDSCAPE (east, x=50 z=0)
Chinese Chan landscape, NOT Japanese zen garden.
- Small craggy mountain peaks rising dramatically (like Song dynasty landscape paintings)
- Arched stone moon bridge crossing a small stream/pond
- Tea bush rows on the hillside (low rounded green shrubs in terraced rows)
- ReadZen Temple: Chinese pagoda with upturned eaves, paper lanterns
- Open Zen Pavilion (亭 ting): open-air roofed structure without walls
- Mist/fog effect at the base of the peaks
- Feel: Wuyishan mountain hermit retreat, Hangzhou Longjing tea fields

### 3. MEADOW (northeast, x=35 z=-40)
- Rolling gentle hills, bright green grass
- Wildflower patches (small colored dots/sprites)
- LunaLog Observatory: dome with telescope, crescent moon shapes, moonlit glow
- Open, airy, peaceful feel

### 4. FOREST (northwest, x=-35 z=-40)
- Dense low-poly pine trees on gentle hills
- Dark green ground, mushroom clusters
- Vortex Lab: structure with branching timeline visual (glowing lines diverging from center)
- Mysterious, contemplative feel
- Clearing in the trees for the building

### 5. CANYON (west, x=-50 z=0)
- A rift/crack in the terrain, 4-6 units deep, narrow (~10 units wide)
- Brown/orange cliff walls, sheer drops
- Boulders scattered along the floor and edges
- SE4x Control Tower: angular sci-fi tower rising from one side, blinking lights, hex grid on ground
- Dramatic, rugged, alien feel

### 6. LAKE SHORE (south, x=0 z=50)
- Low area near a flat blue water plane
- Sandy beach edge (tan/wheat vertex colors)
- Flat water surface at y=0.5 (simple transparent blue mesh, no physics)
- WhoGoesFirst Plaza: giant oversized game table with dice on the shore
- Fun, playful, inviting feel

## Terrain Implementation

The heightmap is a combination of hand-placed features, NOT uniform noise:

```typescript
function height(x: number, z: number): number {
  let h = 0;
  // Central hill (flat-topped plateau)
  h += hilltop(x, z);
  // Canyon (west) — sharp negative drop in a narrow band
  h += canyon(x, z);
  // Mountain peaks (east) — sharp narrow peaks
  h += mountainPeaks(x, z);
  // Gentle rolling hills in meadow (NE)
  h += meadowHills(x, z);
  // Forest gentle bumps (NW)
  h += forestHills(x, z);
  // Lake depression (south)
  h += lakeBed(x, z);
  // Tea terrace slopes (east hillside)
  h += teaTerraces(x, z);
  // Very subtle global noise
  h += subtleNoise(x, z);
  return h;
}
```

## Vertex Coloring

Zone-based by (x, z) position, NOT by height:

| Zone | Ground Color | Notes |
|------|-------------|-------|
| Hilltop | Grass green #4a7c3f | Flat top |
| Mountain Tea | Moss green #3a6633 + brown paths #8b6914 | Terraced |
| Meadow | Bright green #5a9e4a + flower dots | Rolling |
| Forest | Dark green #2d4a27 | Dense canopy shadow |
| Canyon | Brown/orange #a0622a + grey rock #888888 | Cliff faces |
| Lake Shore | Sandy tan #d4b483 near water, green further | Beach |
| Paths | Dirt brown #9e7c4f | Connect zones |

## Water

Flat semi-transparent plane at y=0.5 covering the lake area (south).
- MeshBasicMaterial({ color: 0x3388cc, transparent: true, opacity: 0.6 })
- No physics — car height is clamped above water level

## Props (by zone, later waves)

| Zone | Props |
|------|-------|
| Forest | Low-poly pine trees (cone + cylinder trunk) |
| Meadow | Flower sprites, occasional tree |
| Canyon | Boulders (icosahedron), fallen rocks |
| Mountain Tea | Craggy rock peaks, tea bushes, bridge mesh |
| Lake Shore | Beach rocks, reeds |
| Paths | Occasional rock, signpost |

## Buildings (Wave 6)

| Zone | Building | Project |
|------|----------|---------|
| Mountain Tea | Chinese pagoda + open pavilion | ReadZen + Open Zen |
| Meadow | Dome observatory + telescope | LunaLog |
| Forest | Branching-timeline lab | Vortex |
| Canyon | Angular sci-fi tower | SE4x Companion |
| Lake Shore | Giant game table + dice | Who Goes First? |

## Design Principles

1. From the hilltop, you can see all 5+ landmarks
2. Each zone has a distinct color palette, geometry, and mood
3. Dirt paths connect all zones (driveable routes)
4. The car can go off-path but paths are the natural routes
5. Proximity to a building shows the project overlay (same as gallery click)
6. Low-poly PS1 aesthetic throughout: flat shading, vertex colors, minimal textures
