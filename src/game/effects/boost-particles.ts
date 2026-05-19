import {
  AdditiveBlending,
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

const PARTICLE_COUNT = 60;
const OFFSCREEN_Y = -500; // hide dead particles far below

export function createBoostParticles(scene: Scene): BoostParticles {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);
  const lives = new Float32Array(PARTICLE_COUNT);
  const maxLives = new Float32Array(PARTICLE_COUNT);

  // Initialize ALL particles off-screen so they're invisible when dead
  lives.fill(0);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3 + 1] = OFFSCREEN_Y;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));

  const material = new PointsMaterial({
    color: 0xff6600,
    size: 0.6,
    transparent: true,
    opacity: 0.9,
    blending: AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false,
  });

  const points = new Points(geometry, material);
  scene.add(points);

  function tick(dt: number, carGroup: Group, heading: number, active: boolean, intensity: number): void {
    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);

    material.size = 0.4 + intensity * 0.4;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      if (lives[i] <= 0) {
        // Dead particle — hide off-screen
        positions[i3 + 1] = OFFSCREEN_Y;

        if (active) {
          // Respawn at exhaust points on sides of car
          const side = (Math.random() > 0.5 ? 1 : -1) * 0.5;
          const spread = (Math.random() - 0.5) * 0.3;

          // Perpendicular to heading for side offset
          const perpX = -sinH;
          const perpZ = cosH;

          positions[i3] = carGroup.position.x - cosH * 1.5 + perpX * side + spread;
          positions[i3 + 1] = carGroup.position.y + 0.2 + (Math.random() - 0.5) * 0.3;
          positions[i3 + 2] = carGroup.position.z - sinH * 1.5 + perpZ * side + spread;

          // Velocity: mostly sideways + upward, small backward
          const backSpeed = (1 + Math.random() * 2) * (0.5 + intensity * 0.5);
          const sideSpeed = (2 + Math.random() * 3) * (0.5 + intensity * 0.5);
          velocities[i3] = -cosH * backSpeed + perpX * (Math.random() - 0.5) * sideSpeed;
          velocities[i3 + 1] = 2.0 + Math.random() * 3.0;
          velocities[i3 + 2] = -sinH * backSpeed + perpZ * (Math.random() - 0.5) * sideSpeed;

          maxLives[i] = 0.4 + Math.random() * 0.4 + intensity * 0.3;
          lives[i] = maxLives[i];
        }
      } else {
        // Living particle — advance
        positions[i3] += velocities[i3] * dt;
        positions[i3 + 1] += velocities[i3 + 1] * dt;
        positions[i3 + 2] += velocities[i3 + 2] * dt;
        lives[i] -= dt;
      }
    }

    geometry.getAttribute('position').needsUpdate = true;
  }

  function dispose(): void {
    scene.remove(points);
    geometry.dispose();
    material.dispose();
  }

  return { tick, dispose };
}
