import type { CarObject } from './types';
import type { PhysicsWorld } from './physics/rapier-world';
import { initPhysics } from './physics/rapier-world';
import { createTerrain } from './environment/terrain';
import { createCar } from './car/car-model';
import { createSky } from './environment/sky';
import type * as THREE from 'three';

export interface PreloadedAssets {
  physics: PhysicsWorld;
  terrain: THREE.Mesh;
  car: CarObject;
  sky: THREE.CanvasTexture;
}

export async function preloadGameAssets(): Promise<PreloadedAssets> {
  // WASM init is the slowest part — start it first
  const physics = await initPhysics();

  // These are synchronous but geometry-heavy — run after WASM is ready
  const terrain = createTerrain();
  const car = createCar();
  const sky = createSky();

  return { physics, terrain, car, sky };
}
