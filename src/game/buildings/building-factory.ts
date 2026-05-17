import * as THREE from 'three';
import { getHeightAt } from '../environment/terrain';

export interface BuildingData {
  group: THREE.Group;
  projectId: string;
  position: THREE.Vector3;
}

// ── 1. Pagoda ────────────────────────────────────────────────────────
function createPagoda(): THREE.Group {
  const g = new THREE.Group();
  const bodyColor = 0x3E2723;
  const roofColor = 0x8B0000;

  const tiers: [number, number, number, number][] = [
    [3, 1.5, 3, 0],
    [2.5, 1.2, 2.5, 1.5],
    [2, 1, 2, 2.7],
  ];

  for (const [w, h, d, y] of tiers) {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color: bodyColor }),
    );
    body.position.y = y + h / 2;
    g.add(body);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.8, 0.15, d + 0.8),
      new THREE.MeshLambertMaterial({ color: roofColor }),
    );
    roof.position.y = y + h + 0.075;
    g.add(roof);
  }

  // Lanterns hanging from bottom tier
  const lanternMat = new THREE.MeshLambertMaterial({
    color: 0xFFAA00,
    emissive: 0xFFAA00,
    emissiveIntensity: 0.8,
  });
  for (const sx of [-1, 1]) {
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 6),
      lanternMat,
    );
    lantern.position.set(sx * 1.8, 0.3, 0);
    g.add(lantern);
  }

  return g;
}
// ── 2. Pavilion ──────────────────────────────────────────────────────
function createPavilion(): THREE.Group {
  const g = new THREE.Group();
  const postMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 });

  const offsets: [number, number][] = [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]];
  for (const [px, pz] of offsets) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 2.5, 6),
      postMat,
    );
    post.position.set(px, 1.25, pz);
    g.add(post);
  }

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.2, 3),
    new THREE.MeshLambertMaterial({ color: 0x8B0000 }),
  );
  roof.position.y = 2.6;
  g.add(roof);

  return g;
}
// ── 3. Observatory ───────────────────────────────────────────────────
function createObservatory(): THREE.Group {
  const g = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2, 3, 12),
    new THREE.MeshLambertMaterial({ color: 0x9E9E9E }),
  );
  base.position.y = 1.5;
  g.add(base);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xBDBDBD, flatShading: true }),
  );
  dome.position.y = 3;
  g.add(dome);

  const telescope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 3, 8),
    new THREE.MeshLambertMaterial({ color: 0x424242 }),
  );
  telescope.position.set(0, 4, 0.8);
  telescope.rotation.x = THREE.MathUtils.degToRad(30);
  g.add(telescope);

  return g;
}
// ── 4. Lab ───────────────────────────────────────────────────────────
function createLab(): THREE.Group {
  const g = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3, 2.5, 2.5),
    new THREE.MeshLambertMaterial({ color: 0x2E2E2E }),
  );
  body.position.y = 1.25;
  g.add(body);

  // Angled wings
  const wingMat = new THREE.MeshLambertMaterial({ color: 0x3A3A3A });
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.8, 1.2),
      wingMat,
    );
    wing.position.set(sx * 2.1, 0.9, sx * 0.5);
    wing.rotation.y = sx * 0.3;
    g.add(wing);
  }

  // Branching emissive lines
  const lineMat = new THREE.MeshLambertMaterial({
    color: 0x00FF88,
    emissive: 0x00FF88,
    emissiveIntensity: 0.6,
  });
  const lineOffsets: [number, number, number, number][] = [
    [0, 2.0, 0.3, 0],
    [-0.6, 1.6, 0.5, 0.4],
    [0.6, 1.6, 0.5, -0.4],
  ];
  for (const [x, y, w, rot] of lineOffsets) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.05, 0.05),
      lineMat,
    );
    line.position.set(x, y, 1.26);
    line.rotation.z = rot;
    g.add(line);
  }

  return g;
}
// ── 5. Tower ─────────────────────────────────────────────────────────
function createTower(): THREE.Group {
  const g = new THREE.Group();

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.2, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0x607D8B }),
  );
  tower.position.y = 4;
  g.add(tower);

  // Accent bands
  const bandMat = new THREE.MeshLambertMaterial({ color: 0x455A64 });
  for (const by of [2, 5, 7]) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.15, 3.2),
      bandMat,
    );
    band.position.y = by;
    g.add(band);
  }

  // Antenna with emissive tip
  const antenna = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 1.5, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x90A4AE }),
  );
  antenna.position.y = 8.75;
  g.add(antenna);

  const tip = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    new THREE.MeshLambertMaterial({
      color: 0x4488FF,
      emissive: 0x4488FF,
      emissiveIntensity: 0.8,
    }),
  );
  tip.position.y = 9.6;
  g.add(tip);

  return g;
}
// ── 6. Game Table ────────────────────────────────────────────────────
function createGameTable(): THREE.Group {
  const g = new THREE.Group();

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.8, 1.5),
    new THREE.MeshLambertMaterial({ color: 0x8D6E63 }),
  );
  top.position.y = 0.8;
  g.add(top);

  // Legs
  const legMat = new THREE.MeshLambertMaterial({ color: 0x6D4C41 });
  const legOffsets: [number, number][] = [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]];
  for (const [lx, lz] of legOffsets) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8),
      legMat,
    );
    leg.position.set(lx, 0.2, lz);
    g.add(leg);
  }

  // Dice
  const dice = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.4, 0),
    new THREE.MeshLambertMaterial({ color: 0xFFFFFF, flatShading: true }),
  );
  dice.position.y = 1.6;
  g.add(dice);

  return g;
}
// ── Main factory ─────────────────────────────────────────────────────
const defs: [() => THREE.Group, number, number, string][] = [
  [createPagoda,       50,   0, 'readzen'],
  [createPavilion,     55,   5, 'openzen'],
  [createObservatory,  35, -40, 'lunalog'],
  [createLab,         -35, -40, 'qda'],
  [createTower,       -50,   0, 'se4x'],
  [createGameTable,     0,  50, 'whogoesfirst'],
];

export function createBuildings(scene: THREE.Scene): BuildingData[] {
  return defs.map(([create, x, z, projectId]) => {
    const group = create();
    const y = getHeightAt(x, z);
    group.position.set(x, y, z);
    scene.add(group);
    return { group, projectId, position: new THREE.Vector3(x, y, z) };
  });
}
