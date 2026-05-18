import { Vector3 } from 'three';
import type { InputState, CarObject, CarPhysicsState } from '../types';
import { CONFIG } from '../types';
import { getHeightAt } from '../environment/terrain';

export interface CarPhysicsController {
  tick(dt: number, input: InputState): void;
  getState(): CarPhysicsState;
  correctPosition(x: number, z: number, vel: number): void;
  reset(): void;
}

export function createCarPhysics(car: CarObject): CarPhysicsController {
  const position = new Vector3();
  let velocity = 0;
  let heading = 0;
  let steeringAngle = 0;
  let verticalVelocity = 0;
  let isAirborne = false;
  let boostActive = false;
  let boostCharge = 1.0;
  let jumpConsumed = false; // edge detection: only jump once per key press

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

    // Boost logic — hold to drain, release to recharge
    if (input.boost && boostCharge > CONFIG.BOOST_MIN_ACTIVATE) {
      boostActive = true;
      boostCharge = Math.max(0, boostCharge - CONFIG.BOOST_DRAIN_RATE * dt);
      if (boostCharge <= 0) boostActive = false;
    } else {
      boostActive = false;
      boostCharge = Math.min(1, boostCharge + CONFIG.BOOST_RECHARGE_RATE * dt);
    }
    const effectiveMaxSpeed = boostActive ? CONFIG.MAX_SPEED * CONFIG.BOOST_MULTIPLIER : CONFIG.MAX_SPEED;

    // 6. Clamp speed
    velocity = Math.max(-effectiveMaxSpeed / 3, Math.min(effectiveMaxSpeed, velocity));

    // 7. Steering lerp (clamped factor so it can't overshoot)
    const steerLerp = Math.min(1, 10 * dt);
    if (input.left) {
      steeringAngle += (-0.5 - steeringAngle) * steerLerp;
    } else if (input.right) {
      steeringAngle += (0.5 - steeringAngle) * steerLerp;
    } else {
      steeringAngle += (0 - steeringAngle) * steerLerp;
    }

    // 8. Heading (steering only affects heading when car is moving, reduced when airborne)
    heading += steeringAngle * (velocity / CONFIG.MAX_SPEED) * CONFIG.TURN_RATE * dt * (isAirborne ? 0.3 : 1.0);

    // 9. Position (XZ)
    position.x += Math.cos(heading) * velocity * dt;
    position.z += Math.sin(heading) * velocity * dt;

    // Terrain following + jump
    const groundHeight = getHeightAt(position.x, position.z);
    // Edge-detect jump: only trigger once per key press
    if (input.jump && !isAirborne && !jumpConsumed) {
      verticalVelocity = CONFIG.JUMP_FORCE;
      isAirborne = true;
      jumpConsumed = true;
    }
    if (!input.jump) jumpConsumed = false;
    if (isAirborne) {
      verticalVelocity -= CONFIG.GRAVITY * dt;
      position.y += verticalVelocity * dt;
      if (position.y <= groundHeight) {
        position.y = groundHeight;
        verticalVelocity = 0;
        isAirborne = false;
      }
    } else {
      position.y = groundHeight;
    }

    // 10. Sync car group
    car.group.position.copy(position);
    car.group.rotation.y = -heading;

    // 11. Wheel spin — applied to inner wheelGroup (child[0] of each pivot)
    for (const pivot of car.wheels) {
      const wheelGroup = pivot.children[0];
      if (wheelGroup) wheelGroup.rotation.z += velocity * dt * 3;
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
      isAirborne,
      boostActive,
      boostCharge,
    };
  }

  function reset(): void {
    position.set(0, getHeightAt(0, 0), 0);
    velocity = 0;
    heading = 0;
    steeringAngle = 0;
    verticalVelocity = 0;
    isAirborne = false;
    boostActive = false;
    boostCharge = 1.0;
    jumpConsumed = false;
    car.group.position.set(0, getHeightAt(0, 0), 0);
    car.group.rotation.set(0, 0, 0);
  }

  function correctPosition(x: number, z: number, vel: number): void {
    position.x = x;
    position.z = z;
    if (!isAirborne) position.y = getHeightAt(x, z);
    velocity = vel;
    car.group.position.copy(position);
  }

  return { tick, getState, correctPosition, reset };
}
