import {
  BufferAttribute,
  BufferGeometry,
  Points,
  PointsMaterial,
} from 'three';
import type { Group, Scene } from 'three';

export interface BoostParticles {
  tick(dt: number, carGroup: Group, heading: number, active: boolean, intensity: number): void;
  dispose(): void;
}

const FIRE_COUNT = 60;
const SMOKE_COUNT = 40;
const HIDE_Y = -500;

export function createBoostParticles(scene: Scene): BoostParticles {
  // --- Fire particles ---
  const firePos = new Float32Array(FIRE_COUNT * 3);
  const fireVel = new Float32Array(FIRE_COUNT * 3);
  const fireLife = new Float32Array(FIRE_COUNT);
  const fireColors = new Float32Array(FIRE_COUNT * 3);

  for (let i = 0; i < FIRE_COUNT; i++) firePos[i * 3 + 1] = HIDE_Y;

  const fireGeo = new BufferGeometry();
  fireGeo.setAttribute('position', new BufferAttribute(firePos, 3));
  fireGeo.setAttribute('color', new BufferAttribute(fireColors, 3));

  const fireMat = new PointsMaterial({
    size: 1.0,
    transparent: true,
    opacity: 0.9,
    vertexColors: true,
    sizeAttenuation: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  fireMat.toneMapped = false;

  const firePts = new Points(fireGeo, fireMat);
  firePts.frustumCulled = false;
  scene.add(firePts);

  // --- Smoke particles ---
  const smokePos = new Float32Array(SMOKE_COUNT * 3);
  const smokeVel = new Float32Array(SMOKE_COUNT * 3);
  const smokeLife = new Float32Array(SMOKE_COUNT);

  for (let i = 0; i < SMOKE_COUNT; i++) smokePos[i * 3 + 1] = HIDE_Y;

  const smokeGeo = new BufferGeometry();
  smokeGeo.setAttribute('position', new BufferAttribute(smokePos, 3));

  const smokeMat = new PointsMaterial({
    color: 0x333333,
    size: 1.8,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });

  const smokePts = new Points(smokeGeo, smokeMat);
  smokePts.frustumCulled = false;
  scene.add(smokePts);

  // Fire color palette: white → yellow → orange → red
  function randomFireColor(i3: number): void {
    const r = Math.random();
    if (r < 0.15) {
      // White-hot core
      fireColors[i3] = 1; fireColors[i3 + 1] = 0.95; fireColors[i3 + 2] = 0.8;
    } else if (r < 0.4) {
      // Bright yellow
      fireColors[i3] = 1; fireColors[i3 + 1] = 0.8; fireColors[i3 + 2] = 0.2;
    } else if (r < 0.75) {
      // Orange
      fireColors[i3] = 1; fireColors[i3 + 1] = 0.4; fireColors[i3 + 2] = 0;
    } else {
      // Deep red-orange
      fireColors[i3] = 0.9; fireColors[i3 + 1] = 0.15; fireColors[i3 + 2] = 0;
    }
  }

  function tick(dt: number, car: Group, heading: number, active: boolean, intensity: number): void {
    const cH = Math.cos(heading);
    const sH = Math.sin(heading);
    const pX = -sH; // perpendicular
    const pZ = cH;

    fireMat.size = 0.9 + intensity * 0.7;
    smokeMat.size = 1.2 + intensity * 1.0;
    smokeMat.opacity = 0.3 + intensity * 0.3;

    // --- Fire ---
    for (let i = 0; i < FIRE_COUNT; i++) {
      const i3 = i * 3;
      if (fireLife[i] <= 0) {
        firePos[i3 + 1] = HIDE_Y;
        if (active) {
          const side = (i % 2 === 0 ? -1 : 1) * (0.25 + Math.random() * 0.2);
          firePos[i3]     = car.position.x - cH * 1.8 + pX * side;
          firePos[i3 + 1] = car.position.y + 0.15 + Math.random() * 0.2;
          firePos[i3 + 2] = car.position.z - sH * 1.8 + pZ * side;

          const spd = (3 + Math.random() * 2) * (0.5 + intensity * 0.5);
          fireVel[i3]     = -cH * spd + pX * (Math.random() - 0.5) * 2;
          fireVel[i3 + 1] = 0.2 + Math.random() * 0.5;
          fireVel[i3 + 2] = -sH * spd + pZ * (Math.random() - 0.5) * 2;

          randomFireColor(i3);
          fireLife[i] = 0.3 + Math.random() * 0.5 + intensity * 0.2;
        }
      } else {
        firePos[i3]     += fireVel[i3] * dt;
        firePos[i3 + 1] += fireVel[i3 + 1] * dt;
        firePos[i3 + 2] += fireVel[i3 + 2] * dt;
        fireLife[i] -= dt;
      }
    }
    fireGeo.getAttribute('position').needsUpdate = true;
    fireGeo.getAttribute('color').needsUpdate = true;

    // --- Smoke ---
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const i3 = i * 3;
      if (smokeLife[i] <= 0) {
        smokePos[i3 + 1] = HIDE_Y;
        if (active) {
          const side = (Math.random() - 0.5) * 0.6;
          smokePos[i3]     = car.position.x - cH * 2.0 + pX * side;
          smokePos[i3 + 1] = car.position.y + 0.3 + Math.random() * 0.2;
          smokePos[i3 + 2] = car.position.z - sH * 2.0 + pZ * side;

          const spd = (1 + Math.random() * 1.5) * (0.3 + intensity * 0.3);
          smokeVel[i3]     = -cH * spd + pX * (Math.random() - 0.5) * 1.5;
          smokeVel[i3 + 1] = 0.8 + Math.random() * 1.5; // smoke rises more
          smokeVel[i3 + 2] = -sH * spd + pZ * (Math.random() - 0.5) * 1.5;

          smokeLife[i] = 0.6 + Math.random() * 0.8 + intensity * 0.3;
        }
      } else {
        smokePos[i3]     += smokeVel[i3] * dt;
        smokePos[i3 + 1] += smokeVel[i3 + 1] * dt;
        smokePos[i3 + 2] += smokeVel[i3 + 2] * dt;
        smokeLife[i] -= dt;
      }
    }
    smokeGeo.getAttribute('position').needsUpdate = true;
  }

  function dispose(): void {
    scene.remove(firePts);
    scene.remove(smokePts);
    fireGeo.dispose();
    smokeGeo.dispose();
    fireMat.dispose();
    smokeMat.dispose();
  }

  return { tick, dispose };
}
