import {
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  Points,
  PointsMaterial,
} from 'three';
import type { Group, Scene } from 'three';

export interface BoostParticles {
  tick(dt: number, carGroup: Group, heading: number, active: boolean, intensity: number): void;
  dispose(): void;
}

const COUNT = 80;
const HIDE_Y = -500;

export function createBoostParticles(scene: Scene): BoostParticles {
  const pos = new Float32Array(COUNT * 3);
  const vel = new Float32Array(COUNT * 3);
  const life = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) pos[i * 3 + 1] = HIDE_Y;

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));

  // Bright orange, NormalBlending so visible against sky
  const mat = new PointsMaterial({
    color: 0xff4400,
    size: 1.0,
    transparent: true,
    opacity: 0.85,
    blending: NormalBlending,
    sizeAttenuation: true,
    depthWrite: false,
  });

  const pts = new Points(geo, mat);
  scene.add(pts);

  function tick(dt: number, car: Group, heading: number, active: boolean, intensity: number): void {
    const cH = Math.cos(heading);
    const sH = Math.sin(heading);
    // Perpendicular to heading (right vector)
    const pX = -sH;
    const pZ = cH;

    mat.size = 0.8 + intensity * 0.6;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;

      if (life[i] <= 0) {
        pos[i3 + 1] = HIDE_Y; // hide dead

        if (active) {
          // Spawn at two exhaust pipes — left and right of car rear
          const side = (i % 2 === 0 ? -1 : 1) * (0.3 + Math.random() * 0.2);

          pos[i3]     = car.position.x - cH * 1.8 + pX * side;
          pos[i3 + 1] = car.position.y + 0.15 + Math.random() * 0.15;
          pos[i3 + 2] = car.position.z - sH * 1.8 + pZ * side;

          // Velocity: backward from car + slight side spread + gentle rise
          const spd = (3 + Math.random() * 2) * (0.5 + intensity * 0.5);
          vel[i3]     = -cH * spd + pX * (Math.random() - 0.5) * 2;
          vel[i3 + 1] = 0.3 + Math.random() * 0.7; // gentle rise, stays in view
          vel[i3 + 2] = -sH * spd + pZ * (Math.random() - 0.5) * 2;

          life[i] = 0.5 + Math.random() * 0.5 + intensity * 0.3;
        }
      } else {
        pos[i3]     += vel[i3] * dt;
        pos[i3 + 1] += vel[i3 + 1] * dt;
        pos[i3 + 2] += vel[i3 + 2] * dt;
        life[i] -= dt;
      }
    }

    geo.getAttribute('position').needsUpdate = true;
  }

  function dispose(): void {
    scene.remove(pts);
    geo.dispose();
    mat.dispose();
  }

  return { tick, dispose };
}
