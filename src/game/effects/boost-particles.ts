import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  PointsMaterial,
} from 'three';
import type { Group, Scene } from 'three';

export interface BoostParticles {
  tick(dt: number, carGroup: Group, heading: number, active: boolean): void;
  dispose(): void;
}

const PARTICLE_COUNT = 40;

export function createBoostParticles(scene: Scene): BoostParticles {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);
  const lives = new Float32Array(PARTICLE_COUNT);
  const maxLives = new Float32Array(PARTICLE_COUNT);

  // All particles start dead
  lives.fill(0);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));

  const material = new PointsMaterial({
    color: 0xff6600,
    size: 0.2,
    transparent: true,
    opacity: 0.8,
    blending: AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false,
  });

  const points = new Points(geometry, material);
  scene.add(points);

  function tick(dt: number, carGroup: Group, heading: number, active: boolean): void {
    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      if (lives[i] <= 0) {
        // Dead particle — respawn only when boost is active
        if (active) {
          const spread = (Math.random() - 0.5) * 0.4; // ±0.2
          const spreadY = (Math.random() - 0.5) * 0.4;

          positions[i3] = carGroup.position.x - cosH * 1.5 + spread;
          positions[i3 + 1] = carGroup.position.y + 0.3 + spreadY;
          positions[i3 + 2] = carGroup.position.z - sinH * 1.5 + spread;

          const speed = 3 + Math.random() * 2; // 3-5
          velocities[i3] = -cosH * speed + (Math.random() - 0.5) * 0.5;
          velocities[i3 + 1] = (Math.random() - 0.5) * 0.5;
          velocities[i3 + 2] = -sinH * speed + (Math.random() - 0.5) * 0.5;

          maxLives[i] = 0.3 + Math.random() * 0.3; // 0.3-0.6
          lives[i] = maxLives[i];
        }
      } else {
        // Living particle — advance and age
        positions[i3] += velocities[i3] * dt;
        positions[i3 + 1] += velocities[i3 + 1] * dt;
        positions[i3 + 2] += velocities[i3 + 2] * dt;

        lives[i] -= dt;
      }
    }

    // Scale overall point size by average remaining life fraction
    // (simple approach: use material size directly)
    // Individual size-per-particle would need a custom shader,
    // so we keep uniform size and rely on opacity + additive blending for fade.
    const posAttr = geometry.getAttribute('position');
    posAttr.needsUpdate = true;
  }

  function dispose(): void {
    scene.remove(points);
    geometry.dispose();
    material.dispose();
  }

  return { tick, dispose };
}
