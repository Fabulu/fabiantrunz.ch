import * as THREE from 'three';
import type { PhysicsWorld } from './rapier-world';
import RAPIER from '@dimforge/rapier3d-compat';
import { getHeightAt } from '../environment/terrain';

export interface RockField {
  meshes: THREE.Mesh[];
  syncAll(): void;
  dispose(scene: THREE.Scene): void;
}

// Simple seeded random for deterministic placement
function mulberry32(seed: number) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function createRocks(
  scene: THREE.Scene,
  physics: PhysicsWorld,
  count: number = 35,
): RockField {
  const rand = mulberry32(42); // deterministic seed
  const meshes: THREE.Mesh[] = [];
  const bodies: RAPIER.RigidBody[] = [];

  const rockColors = [0x888888, 0x777766, 0x999988, 0x666655, 0x8b7355];

  for (let i = 0; i < count; i++) {
    // Random position, avoiding hilltop (center) and lake (south)
    let x: number, z: number;
    do {
      x = (rand() - 0.5) * 160; // [-80, 80]
      z = (rand() - 0.5) * 160;
    } while (
      Math.sqrt(x * x + z * z) < 15 || // avoid hilltop
      Math.sqrt(x * x + (z - 50) * (z - 50)) < 20 // avoid lake
    );

    const radius = 0.3 + rand() * 0.7; // 0.3 to 1.0
    const y = getHeightAt(x, z) + radius;

    // Create rock geometry with vertex displacement for variety
    const indexed = new THREE.IcosahedronGeometry(radius, 1);
    const geo = indexed.toNonIndexed();
    indexed.dispose();
    const pos = geo.getAttribute('position');
    for (let v = 0; v < pos.count; v++) {
      pos.setX(v, pos.getX(v) + (rand() - 0.5) * radius * 0.03);
      pos.setY(v, pos.getY(v) + (rand() - 0.5) * radius * 0.03);
      pos.setZ(v, pos.getZ(v) + (rand() - 0.5) * radius * 0.03);
    }
    geo.computeVertexNormals();

    const color = rockColors[Math.floor(rand() * rockColors.length)]!;
    const mat = new THREE.MeshLambertMaterial({ color, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    meshes.push(mesh);

    // Rapier: dynamic body + ball collider
    const mass = radius * radius * radius * 5;
    const colliderDesc = RAPIER.ColliderDesc.ball(radius)
      .setRestitution(0.3)
      .setFriction(0.8);
    const { body } = physics.addDynamicBody({ x, y, z }, colliderDesc, mass);
    bodies.push(body);
  }

  function syncAll(): void {
    for (let i = 0; i < meshes.length; i++) {
      physics.syncMeshToBody(meshes[i]!, bodies[i]!);
    }
  }

  function dispose(sceneRef: THREE.Scene): void {
    for (let i = 0; i < meshes.length; i++) {
      sceneRef.remove(meshes[i]!);
      meshes[i]!.geometry.dispose();
      (meshes[i]!.material as THREE.Material).dispose();
      physics.world.removeRigidBody(bodies[i]!);
    }
    meshes.length = 0;
    bodies.length = 0;
  }

  return { meshes, syncAll, dispose };
}
