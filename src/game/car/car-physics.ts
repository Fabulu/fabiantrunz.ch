import { Vector3 } from 'three';
import type { InputState, CarObject, CarPhysicsState } from '../types';
import { CONFIG } from '../types';

export interface CarPhysicsController {
  tick(dt: number, input: InputState): void;
  getState(): CarPhysicsState;
  reset(): void;
}

export function createCarPhysics(car: CarObject): CarPhysicsController {
  const position = new Vector3();
  let velocity = 0;
  let heading = 0;
  let steeringAngle = 0;

  function tick(dt: number, input: InputState): void {
    if (dt <= 0 || dt > 0.2) return; // skip zero or huge dt (tab unfocus)

    // 1. Acceleration
    if (input.forward) velocity += CONFIG.ACCELERATION * dt;
    // 2. Reverse (slower)
    if (input.backward) velocity -= CONFIG.ACCELERATION * dt * 0.6;
    // 3. Brake (clamped to prevent sign flip)
    if (input.brake) velocity *= Math.max(0, 1 - CONFIG.BRAKE_FORCE * dt);
    // 4. Friction (time-corrected: consistent regardless of frame rate)
    velocity *= Math.pow(CONFIG.FRICTION, dt * 60);
    // 5. Dead zone — snap to zero when nearly stopped
    if (Math.abs(velocity) < 0.01) velocity = 0;
    // 6. Clamp speed
    velocity = Math.max(-CONFIG.MAX_SPEED / 3, Math.min(CONFIG.MAX_SPEED, velocity));

    // 7. Steering lerp (clamped factor so it can't overshoot)
    const steerLerp = Math.min(1, 10 * dt);
    if (input.left) {
      steeringAngle += (-0.5 - steeringAngle) * steerLerp;
    } else if (input.right) {
      steeringAngle += (0.5 - steeringAngle) * steerLerp;
    } else {
      steeringAngle += (0 - steeringAngle) * steerLerp;
    }

    // 8. Heading (steering only affects heading when car is moving)
    heading += steeringAngle * (velocity / CONFIG.MAX_SPEED) * CONFIG.TURN_RATE * dt;

    // 9. Position
    position.x += Math.cos(heading) * velocity * dt;
    position.z += Math.sin(heading) * velocity * dt;

    // 10. Sync car group
    car.group.position.copy(position);
    car.group.rotation.y = -heading;

    // 11. Wheel spin — applied to inner wheelGroup (child[0] of each pivot)
    for (const pivot of car.wheels) {
      const wheelGroup = pivot.children[0];
      if (wheelGroup) wheelGroup.rotation.x += velocity * dt * 3;
    }

    // 12. Front wheel steering visual — applied to the pivot's Y rotation
    for (const pivot of car.frontWheels) {
      pivot.rotation.y = steeringAngle;
    }
  }

  function getState(): CarPhysicsState {
    return {
      position: position.clone(),
      velocity,
      heading,
      steeringAngle,
    };
  }

  function reset(): void {
    position.set(0, 0, 0);
    velocity = 0;
    heading = 0;
    steeringAngle = 0;
    car.group.position.set(0, 0, 0);
    car.group.rotation.set(0, 0, 0);
  }

  return { tick, getState, reset };
}
