import type { Vector3 } from 'three';

const CAR_RADIUS = 1.5;

export interface Obstacle {
  center: { x: number; z: number };
  radius: number;
}

export interface ObstacleSystem {
  resolve(
    position: Vector3,
    velocity: number,
    heading: number,
  ): { correctedX: number; correctedZ: number; correctedVelocity: number };
}

export function createObstacleSystem(obstacles: Obstacle[]): ObstacleSystem {
  function resolve(
    position: Vector3,
    velocity: number,
    heading: number,
  ): { correctedX: number; correctedZ: number; correctedVelocity: number } {
    let cx = position.x;
    let cz = position.z;
    let cv = velocity;

    for (const obs of obstacles) {
      const dx = cx - obs.center.x;
      const dz = cz - obs.center.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = obs.radius + CAR_RADIUS;

      if (dist < minDist && dist > 0.0001) {
        // Push car out along penetration vector
        const nx = dx / dist;
        const nz = dz / dist;
        const penetration = minDist - dist;
        cx += nx * penetration;
        cz += nz * penetration;

        // Kill velocity if moving toward obstacle
        const moveX = Math.cos(heading);
        const moveZ = Math.sin(heading);
        // dot > 0 means car heading aligns with push-out direction (moving away)
        // dot < 0 means car is moving into the obstacle
        const dot = moveX * nx + moveZ * nz;
        if ((cv > 0 && dot < 0) || (cv < 0 && dot > 0)) {
          cv = 0;
        }
      }
    }

    return { correctedX: cx, correctedZ: cz, correctedVelocity: cv };
  }

  return { resolve };
}
