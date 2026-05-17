import type { BuildingData } from './building-factory';
import type { Vector3 } from 'three';
import { showOverlay, hideOverlay } from '../../components/overlay';

export interface ProximitySystem {
  update(carPosition: Vector3): void;
  dispose(): void;
}

export function createProximitySystem(buildings: BuildingData[]): ProximitySystem {
  let activeProjectId: string | null = null;

  function update(carPosition: Vector3): void {
    for (const building of buildings) {
      // XZ distance only (ignore height differences from terrain)
      const dx = carPosition.x - building.position.x;
      const dz = carPosition.z - building.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 5 && activeProjectId === null) {
        activeProjectId = building.projectId;
        showOverlay(building.projectId);
        return;
      }

      if (dist > 8 && activeProjectId === building.projectId) {
        hideOverlay();
        activeProjectId = null;
        return;
      }
    }
  }

  function dispose(): void {
    if (activeProjectId !== null) {
      hideOverlay();
      activeProjectId = null;
    }
  }

  return { update, dispose };
}
