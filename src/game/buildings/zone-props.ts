import type * as THREE from 'three';
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import { getHeightAt } from '../environment/terrain';

// Seeded PRNG – mulberry32
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createZoneProps(scene: THREE.Scene): THREE.Group {
  const rand = mulberry32(99);
  const parent = new Group();

  // ── Shared materials ──────────────────────────────────────────
  const matPineGreen = new MeshLambertMaterial({ color: 0x1b5e20 });
  const matTrunkBrown = new MeshLambertMaterial({ color: 0x5d4037 });
  const matTeaBush = new MeshLambertMaterial({ color: 0x2e7d32 });
  const matBridge = new MeshLambertMaterial({ color: 0x8d6e63 });
  const matMeadowTree = new MeshLambertMaterial({ color: 0x4caf50 });
  const matFlowerPink = new MeshLambertMaterial({ color: 0xff69b4, side: DoubleSide });
  const matFlowerGold = new MeshLambertMaterial({ color: 0xffd700, side: DoubleSide });
  const matFlowerPurple = new MeshLambertMaterial({ color: 0x9c27b0, side: DoubleSide });
  const flowerMats = [matFlowerPink, matFlowerGold, matFlowerPurple];
  const matBoulder = new MeshLambertMaterial({ color: 0x888888 });
  const matReed = new MeshLambertMaterial({ color: 0x7cb342 });
  const matBeachRock = new MeshLambertMaterial({ color: 0xbcaaa4 });

  // ── Shared geometries ─────────────────────────────────────────
  const geoPineCrown = new ConeGeometry(1, 3, 6);
  const geoPineTrunk = new CylinderGeometry(0.2, 0.2, 1, 6);
  const geoTeaBush = new SphereGeometry(0.4, 6, 4);
  const geoMeadowCrown = new ConeGeometry(1.2, 4, 6);
  const geoMeadowTrunk = new CylinderGeometry(0.2, 0.2, 1.2, 6);
  const geoFlower = new PlaneGeometry(0.3, 0.3);


  // ── Helpers ───────────────────────────────────────────────────
  function dist2D(ax: number, az: number, bx: number, bz: number): number {
    const dx = ax - bx;
    const dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function randomInCircle(cx: number, cz: number, r: number): [number, number] {
    const angle = rand() * Math.PI * 2;
    const dist = Math.sqrt(rand()) * r;
    return [cx + Math.cos(angle) * dist, cz + Math.sin(angle) * dist];
  }

  // ────────────────────────────────────────────────────────────
  // 1. Forest zone (-35, -40, radius 20) — 18 pine trees
  // ────────────────────────────────────────────────────────────
  for (let i = 0; i < 18; i++) {
    const [x, z] = randomInCircle(-35, -40, 20);
    if (dist2D(x, z, -35, -40) < 4) continue;

    const y = getHeightAt(x, z);
    const tree = new Group();

    const crown = new Mesh(geoPineCrown, matPineGreen);
    crown.position.set(0, 1 + 1.5, 0); // trunk top + half crown height
    tree.add(crown);

    const trunk = new Mesh(geoPineTrunk, matTrunkBrown);
    trunk.position.set(0, 0.5, 0);
    tree.add(trunk);

    tree.position.set(x, y, z);
    parent.add(tree);
  }

  // ────────────────────────────────────────────────────────────
  // 2. Mountain Tea zone (50, 0, radius 15)
  // ────────────────────────────────────────────────────────────
  // 12 tea bushes in 3 rough rows
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x = 50 - 4 + col * 2.5 + (rand() - 0.5) * 1.5;
      const z = 0 - 3 + row * 3 + (rand() - 0.5) * 1.5;
      if (dist2D(x, z, 50, 0) < 4 || dist2D(x, z, 55, 5) < 4) continue;

      const y = getHeightAt(x, z);
      const bush = new Mesh(geoTeaBush, matTeaBush);
      bush.scale.set(1, 0.6, 1);
      bush.position.set(x, y + 0.24, z);
      parent.add(bush);
    }
  }

  // Arched bridge near (48, 3) — 7 boxes in arc
  const bridgeGeo = new BoxGeometry(0.6, 0.2, 1.2);
  for (let i = 0; i < 7; i++) {
    const t = i / 6; // 0..1
    const angle = Math.PI * t; // 0..PI
    const bx = 48 - 1.8 + i * 0.6;
    const bz = 3;
    const arcY = Math.sin(angle) * 1.2;
    const y = getHeightAt(bx, bz);
    const plank = new Mesh(bridgeGeo, matBridge);
    plank.position.set(bx, y + arcY, bz);
    plank.rotation.z = Math.cos(angle) * 0.3;
    parent.add(plank);
  }

  // ────────────────────────────────────────────────────────────
  // 3. Meadow zone (35, -40, radius 15)
  // ────────────────────────────────────────────────────────────
  // 6 trees (avoid observatory building at 35, -40)
  for (let i = 0; i < 6; i++) {
    let x: number, z: number;
    do {
      [x, z] = randomInCircle(35, -40, 15);
    } while (dist2D(x, z, 35, -40) < 4);
    const y = getHeightAt(x, z);
    const tree = new Group();

    const crown = new Mesh(geoMeadowCrown, matMeadowTree);
    crown.position.set(0, 1.2 + 2, 0);
    tree.add(crown);

    const trunk = new Mesh(geoMeadowTrunk, matTrunkBrown);
    trunk.position.set(0, 0.6, 0);
    tree.add(trunk);

    tree.position.set(x, y, z);
    parent.add(tree);
  }

  // 12 flowers
  for (let i = 0; i < 12; i++) {
    const [x, z] = randomInCircle(35, -40, 15);
    const y = getHeightAt(x, z);
    const mat = flowerMats[i % 3];
    const flower = new Mesh(geoFlower, mat);
    flower.position.set(x, y + 0.15, z);
    flower.rotation.x = -Math.PI / 2; // face up
    parent.add(flower);
  }

  // ────────────────────────────────────────────────────────────
  // 4. Canyon zone (-50, 0, radius 12) — 10 boulders
  // ────────────────────────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const [x, z] = randomInCircle(-50, 0, 12);
    const radius = 0.4 + rand() * 0.4;
    const geo = new IcosahedronGeometry(radius, 1);

    // Vertex displacement for rough look
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const nx = pos.getX(v);
      const ny = pos.getY(v);
      const nz = pos.getZ(v);
      const disp = 1 + (rand() - 0.5) * 0.3;
      pos.setXYZ(v, nx * disp, ny * disp, nz * disp);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const y = getHeightAt(x, z);
    const boulder = new Mesh(geo, matBoulder);
    boulder.position.set(x, y + radius * 0.5, z);
    parent.add(boulder);
  }

  // ────────────────────────────────────────────────────────────
  // 5. Lake Shore zone (0, 50, radius 18)
  // ────────────────────────────────────────────────────────────
  // 5 reed clusters (3 stalks each)
  for (let i = 0; i < 5; i++) {
    const [cx, cz] = randomInCircle(0, 50, 18);
    const y = getHeightAt(cx, cz);
    const cluster = new Group();

    for (let s = 0; s < 3; s++) {
      const h = 1 + rand() * 0.5;
      const stalkGeo = new CylinderGeometry(0.05, 0.05, h, 4);
      const stalk = new Mesh(stalkGeo, matReed);
      stalk.position.set((rand() - 0.5) * 0.3, h * 0.5, (rand() - 0.5) * 0.3);
      cluster.add(stalk);
    }

    cluster.position.set(cx, y, cz);
    parent.add(cluster);
  }

  // 4 beach rocks
  for (let i = 0; i < 4; i++) {
    const [x, z] = randomInCircle(0, 50, 18);
    const radius = 0.2 + rand() * 0.2;
    const geo = new IcosahedronGeometry(radius, 1);

    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const nx = pos.getX(v);
      const ny = pos.getY(v);
      const nz = pos.getZ(v);
      const disp = 1 + (rand() - 0.5) * 0.25;
      pos.setXYZ(v, nx * disp, ny * disp, nz * disp);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const y = getHeightAt(x, z);
    const rock = new Mesh(geo, matBeachRock);
    rock.position.set(x, y + radius * 0.4, z);
    parent.add(rock);
  }

  scene.add(parent);
  return parent;
}
