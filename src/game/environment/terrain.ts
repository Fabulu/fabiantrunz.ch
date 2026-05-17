import type * as THREE from 'three';
import { DoubleSide, CircleGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry } from 'three';

// --- Helper functions ---

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function dist(x1: number, z1: number, x2: number, z2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (z1 - z2) ** 2);
}

function pointToSegmentDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  let t = lenSq > 0 ? ((px - ax) * dx + (pz - az) * dz) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return dist(px, pz, ax + t * dx, az + t * dz);
}

// --- Height function ---

function height(x: number, z: number): number {
  let h = 0;

  // Hilltop: flat-topped plateau
  h += Math.min(8, 10 * Math.exp(-(x * x + z * z) / 500));

  // Mountain peaks (east): 4 narrow gaussians
  const peaks = [
    { x: 45, z: 5, h: 9, s: 120 },
    { x: 55, z: -8, h: 7, s: 80 },
    { x: 48, z: -15, h: 6, s: 100 },
    { x: 60, z: 10, h: 8, s: 60 },
  ];
  for (const p of peaks) h += p.h * Math.exp(-((x - p.x) ** 2 + (z - p.z) ** 2) / p.s);

  // Meadow (NE): sine bumps fading by distance
  const mf = Math.max(0, 1 - dist(x, z, 35, -40) / 30);
  h += mf * (1.5 + Math.sin(x * 0.3) * Math.cos(z * 0.35));

  // Forest (NW): gentle bumps
  const ff = Math.max(0, 1 - dist(x, z, -35, -40) / 30);
  h += ff * (1.2 + 0.8 * Math.sin(x * 0.25 + 1) * Math.cos(z * 0.3 + 2));

  // Canyon (west): sharp drop near x=-50, |z|<25
  const cx = Math.abs(x + 50);
  const cz = Math.abs(z);
  if (cx < 15 && cz < 25) h -= 5 * smoothstep(7, 3, cx) * smoothstep(25, 15, cz);

  // Lake (south): depression
  h -= 2 * Math.max(0, 1 - dist(x, z, 0, 50) / 20);

  // Subtle deterministic noise
  h += 0.15 * Math.sin(x * 0.3) * Math.cos(z * 0.25);

  return h;
}

// --- Zone definitions ---

const ZONES = [
  { name: 'hilltop', cx: 0, cz: 0, r: 0x4a, g: 0x7c, b: 0x3f },
  { name: 'mountain', cx: 50, cz: 0, r: 0x3a, g: 0x66, b: 0x33 },
  { name: 'meadow', cx: 35, cz: -40, r: 0x5a, g: 0x9e, b: 0x4a },
  { name: 'forest', cx: -35, cz: -40, r: 0x2d, g: 0x4a, b: 0x27 },
  { name: 'canyon', cx: -50, cz: 0, r: 0xa0, g: 0x62, b: 0x2a },
  { name: 'lake', cx: 0, cz: 50, r: 0xd4, g: 0xb4, b: 0x83 },
];

const PATH_COLOR = { r: 0x9e, g: 0x7c, b: 0x4f };
const PATH_WIDTH = 3;

// Path segments from origin to each zone center (skip hilltop — zero-length)
const PATH_SEGMENTS = ZONES
  .filter((z) => z.cx !== 0 || z.cz !== 0)
  .map((z) => ({ ax: 0, az: 0, bx: z.cx, bz: z.cz }));

// --- Zone coloring ---

function getZoneColor(x: number, z: number, h: number): [number, number, number] {
  // 1. Find distances to all zone centers
  const distances = ZONES.map((zone, i) => ({ dist: dist(x, z, zone.cx, zone.cz), idx: i }));

  // 2. Sort by distance, pick nearest as primary color
  distances.sort((a, b) => a.dist - b.dist);
  const nearest = ZONES[distances[0].idx];
  let r = nearest.r / 255;
  let g = nearest.g / 255;
  let b = nearest.b / 255;

  // 3. If 2nd nearest is within 10 units difference, blend using smoothstep
  if (distances.length > 1) {
    const diff = distances[1].dist - distances[0].dist;
    if (diff < 10) {
      const blend = 1 - smoothstep(0, 10, diff); // 1 when equidistant, 0 when far apart
      const second = ZONES[distances[1].idx];
      r = r * (1 - blend) + (second.r / 255) * blend;
      g = g * (1 - blend) + (second.g / 255) * blend;
      b = b * (1 - blend) + (second.b / 255) * blend;
    }
  }

  // 4. Check distance to path segments (exclude near endpoints so zone centers keep their color)
  let minPathDist = Infinity;
  for (const seg of PATH_SEGMENTS) {
    // Skip if too close to either endpoint (within 5 units)
    const distToStart = dist(x, z, seg.ax, seg.az);
    const distToEnd = dist(x, z, seg.bx, seg.bz);
    if (distToStart < 5 || distToEnd < 5) continue;
    const d = pointToSegmentDist(x, z, seg.ax, seg.az, seg.bx, seg.bz);
    if (d < minPathDist) minPathDist = d;
  }
  if (minPathDist < PATH_WIDTH) {
    const pathBlend = 1 - minPathDist / PATH_WIDTH;
    r = r + (PATH_COLOR.r / 255 - r) * pathBlend;
    g = g + (PATH_COLOR.g / 255 - g) * pathBlend;
    b = b + (PATH_COLOR.b / 255 - b) * pathBlend;
  }

  // 5. Canyon special case: blend toward grey rock at the bottom of the canyon
  const cxDist = Math.abs(x + 50);
  const czDist = Math.abs(z);
  if (cxDist < 15 && czDist < 25 && h < -2) {
    const greyBlend = Math.min(1, (-2 - h) / 3); // gradual grey at deepest parts
    r = r * (1 - greyBlend) + (0x88 / 255) * greyBlend;
    g = g * (1 - greyBlend) + (0x88 / 255) * greyBlend;
    b = b * (1 - greyBlend) + (0x88 / 255) * greyBlend;
  }

  // 6. PS1 grit: deterministic per-channel offset
  r += 0.04 * Math.sin(x * 17.3 + z * 31.7 + 0 * 100);
  g += 0.04 * Math.sin(x * 17.3 + z * 31.7 + 1 * 100);
  b += 0.04 * Math.sin(x * 17.3 + z * 31.7 + 2 * 100);

  return [r, g, b];
}

// --- Exports ---

export function createTerrain(): THREE.Mesh {
  const geometry = new PlaneGeometry(200, 200, 256, 256);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.getAttribute('position');
  const vertexCount = position.count;
  const colors = new Float32Array(vertexCount * 3);

  for (let i = 0; i < vertexCount; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = height(x, z);
    position.setY(i, y);

    const [r, g, b] = getZoneColor(x, z, y);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });

  const mesh = new Mesh(geometry, material);

  // Water plane for the lake
  const waterGeometry = new CircleGeometry(18, 32);
  waterGeometry.rotateX(-Math.PI / 2);
  const waterMaterial = new MeshBasicMaterial({
    color: 0x3388cc,
    transparent: true,
    opacity: 0.6,
    side: DoubleSide,
  });
  const water = new Mesh(waterGeometry, waterMaterial);
  water.position.set(0, 0.5, 50);
  mesh.add(water);

  return mesh;
}

export function getHeightAt(x: number, z: number): number {
  return height(x, z);
}
