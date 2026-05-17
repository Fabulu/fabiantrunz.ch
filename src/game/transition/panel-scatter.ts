import * as THREE from 'three';
import gsap from 'gsap';
import type { PanelData } from '../../scene/panels';

export interface ScatterItem {
  panel: PanelData;
  velocity: THREE.Vector3;
  angularVel: THREE.Vector3;
  active: boolean;
}

export type PanelScatterState = ScatterItem[];

export function scatterPanels(panels: PanelData[]): PanelScatterState {
  const state: PanelScatterState = [];

  for (const panel of panels) {
    const dir = new THREE.Vector3(
      panel.basePosition.x,
      0,
      panel.basePosition.z
    );

    // Add small random offset to avoid zero vectors
    dir.x += (Math.random() - 0.5) * 0.1;
    dir.z += (Math.random() - 0.5) * 0.1;
    dir.normalize();

    // Y bias of +2 to +4
    dir.y = 2 + Math.random() * 2;

    // Scale by random magnitude 3-6
    const magnitude = 3 + Math.random() * 3;
    const velocity = dir.multiplyScalar(magnitude);

    const angularVel = new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4
    );

    state.push({ panel, velocity, angularVel, active: true });
  }

  return state;
}

export function tickScatter(state: PanelScatterState, dt: number): void {
  if (dt <= 0 || dt > 0.2) return;

  for (const item of state) {
    if (!item.active) continue;

    item.velocity.y -= 9.8 * dt;

    item.panel.mesh.position.addScaledVector(item.velocity, dt);

    item.panel.mesh.rotation.x += item.angularVel.x * dt;
    item.panel.mesh.rotation.y += item.angularVel.y * dt;
    item.panel.mesh.rotation.z += item.angularVel.z * dt;

    if (item.panel.mesh.position.y < -5) {
      item.panel.mesh.position.y = -5; // clamp to floor
      item.velocity.y *= -0.3;
      if (Math.abs(item.velocity.y) < 1) {
        item.active = false;
      }
    }
  }
}

export function resetPanels(state: PanelScatterState): void {
  for (const item of state) {
    item.active = false;

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
      x: s,
      y: s,
      z: s,
      duration: 0.8,
      ease: 'power2.out',
    });
  }
}
