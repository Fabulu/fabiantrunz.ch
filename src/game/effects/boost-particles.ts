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

export function createBoostParticles(scene: Scene): BoostParticles {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);
  const lives = new Float32Array(PARTICLE_COUNT);
  const maxLives = new Float32Array(PARTICLE_COUNT);

  lives.fill(0);

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

    // Scale particle size with intensity (0.4 at low, 0.8 at max)
    material.size = 0.4 + intensity * 0.4;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      if (lives[i] <= 0) {
        if (active) {
          const spread = (Math.random() - 0.5) * 0.5;
          const spreadY = (Math.random() - 0.5) * 0.4;

          // Spawn at two exhaust points on either side of the car rear
          const side = (Math.random() > 0.5 ? 1 : -1) * 0.5;
          // perpendicular to heading: (-sinH, cosH) is the right vector
          positions[i3] = carGroup.position.x - cosH * 1.5 + (-sinH) * side + spread;
          positions[i3 + 1] = carGroup.position.y + 0.2 + spreadY;
          positions[i3 + 2] = carGroup.position.z - sinH * 1.5 + cosH * side + spread;

          // Velocity: mostly sideways + upward, small backward component
          // This keeps particles VISIBLE from chase cam instead of flying into it
          const speed = (2 + Math.random() * 3) * (0.5 + intensity * 0.5);
          const sideSpeed = (3 + Math.random() * 4) * (0.5 + intensity * 0.5);
          velocities[i3] = -cosH * speed + (-sinH) * (Math.random() - 0.5) * sideSpeed;
          velocities[i3 + 1] = 2.0 + Math.random() * 3.0; // strong upward
          velocities[i3 + 2] = -sinH * speed + cosH * (Math.random() - 0.5) * sideSpeed;

          // Longer life at higher intensity
          maxLives[i] = 0.4 + Math.random() * 0.4 + intensity * 0.3;
          lives[i] = maxLives[i];
        }
      } else {
        positions[i3] += velocities[i3] * dt;
        positions[i3 + 1] += velocities[i3 + 1] * dt;
        positions[i3 + 2] += velocities[i3 + 2] * dt;
        lives[i] -= dt;
      }
    }

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
