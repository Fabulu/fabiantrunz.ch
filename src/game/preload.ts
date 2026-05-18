import type { CarObject } from './types';
import type { PhysicsWorld } from './physics/rapier-world';
import { initPhysics } from './physics/rapier-world';
import { createTerrain } from './environment/terrain';
import { createCar } from './car/car-model';
import { createSky } from './environment/sky';
import { fetchAudioBuffers } from './audio/audio-manager';
import type * as THREE from 'three';

export interface PreloadedAssets {
  physics: PhysicsWorld;
  terrain: THREE.Mesh;
  car: CarObject;
  sky: THREE.CanvasTexture;
  audioBuffers: Map<string, ArrayBuffer>;
}

export async function preloadGameAssets(): Promise<PreloadedAssets> {
  // WASM init + audio fetch in parallel (both network-heavy)
  const [physics, audioBuffers] = await Promise.all([
    initPhysics(),
    fetchAudioBuffers(),
  ]);

  // These are synchronous but geometry-heavy — run after WASM is ready
  const terrain = createTerrain();
  const car = createCar();
  const sky = createSky();

  return { physics, terrain, car, sky, audioBuffers };
}
