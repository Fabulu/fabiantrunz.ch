import * as THREE from 'three';
import gsap from 'gsap';
import type { PanelData } from '../../scene/panels';

export interface FloatItem {
  panel: PanelData;
  velocity: THREE.Vector3;
  angularVel: THREE.Vector3;
  scattered: boolean;
  bobPhase: number;
}

export type PanelFloatState = FloatItem[];

/** Initialize panels in floating state (bob until car hits them) */
export function createPanelFloat(panels: PanelData[]): PanelFloatState {
  return panels.map((panel, i) => ({
    panel,
    velocity: new THREE.Vector3(),
    angularVel: new THREE.Vector3(),
    scattered: false,
    bobPhase: i * 1.1, // stagger like gallery mode
  }));
}

const IMPACT_RADIUS = 2.0;

/** Each frame: bob unscattered panels, scatter on car contact, physics on scattered */
export function tickPanelFloat(
  state: PanelFloatState,
  dt: number,
  carPosition: THREE.Vector3,
): void {
  if (dt <= 0 || dt > 0.2) return;

  for (const item of state) {
    if (!item.scattered) {
      // Gentle bobbing
      item.bobPhase += dt * 1.2;
      item.panel.mesh.position.y =
        item.panel.basePosition.y + Math.sin(item.bobPhase) * 0.02;

      // Check car proximity (3D distance so panels above car don't scatter)
      const dx = item.panel.mesh.position.x - carPosition.x;
      const dy = item.panel.mesh.position.y - carPosition.y;
      const dz = item.panel.mesh.position.z - carPosition.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < IMPACT_RADIUS) {
        // Scatter away from car
        item.scattered = true;
        const dir = new THREE.Vector3(dx, 0, dz);
        if (dir.lengthSq() < 0.01) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        dir.normalize();
        dir.y = 2 + Math.random() * 2;
        const magnitude = 3 + Math.random() * 3;
        item.velocity.copy(dir).multiplyScalar(magnitude);
        item.angularVel.set(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
        );
      }
    } else {
      // Physics: gravity + bounce
      item.velocity.y -= 9.8 * dt;
      item.panel.mesh.position.addScaledVector(item.velocity, dt);
      item.panel.mesh.rotation.x += item.angularVel.x * dt;
      item.panel.mesh.rotation.y += item.angularVel.y * dt;
      item.panel.mesh.rotation.z += item.angularVel.z * dt;

      if (item.panel.mesh.position.y < -5) {
        item.panel.mesh.position.y = -5;
        item.velocity.y *= -0.3;
        item.velocity.x *= 0.8;
        item.velocity.z *= 0.8;
      }
    }
  }
}

export function resetPanels(state: PanelFloatState): void {
  for (const item of state) {
    item.scattered = false;
    item.velocity.set(0, 0, 0);
    item.angularVel.set(0, 0, 0);

    gsap.to(item.panel.mesh.position, {
      x: item.panel.basePosition.x,
      y: item.panel.basePosition.y,
      z: item.panel.basePosition.z,
      duration: 0.8,
      ease: 'power2.out',
    });

    gsap.to(item.panel.mesh.rotation, {
      x: item.panel.baseRotation.x,
      y: item.panel.baseRotation.y,
      z: item.panel.baseRotation.z,
      duration: 0.8,
      ease: 'power2.out',
    });

    const s = item.panel.baseScale;
    gsap.to(item.panel.mesh.scale, {
      x: s, y: s, z: s,
      duration: 0.8,
      ease: 'power2.out',
    });
  }
}
