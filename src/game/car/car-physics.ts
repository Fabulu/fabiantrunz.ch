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
  const position = car.group.position.clone();
  let velocity = 0;
  let heading = -car.group.rotation.y; // derive heading from current rotation
  let steeringAngle = 0;
  let verticalVelocity = 0;
  let isAirborne = false;
  let boostActive = false;
  let boostCharge = 1.0;
  let boostIntensity = 0; // ramps 0→1 while boosting
  let jumpConsumed = false;

  function tick(dt: number, input: InputState): void {
    if (dt <= 0 || dt > 0.2) return;

    // 1. Acceleration
    if (input.forward) velocity += CONFIG.ACCELERATION * dt;
    // 2. Reverse (slower)
    if (input.backward) velocity -= CONFIG.ACCELERATION * dt * 0.6;
    // 3. Brake
    if (input.brake) velocity *= Math.max(0, 1 - CONFIG.BRAKE_FORCE * dt);
    // 4. Friction
    velocity *= Math.pow(CONFIG.FRICTION, dt * 60);
    // 5. Dead zone
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

    // Boost intensity ramps up while active, drops when released
    if (boostActive) {
      boostIntensity = Math.min(1, boostIntensity + 0.5 * dt); // reaches 1.0 in 2s
    } else {
      boostIntensity = Math.max(0, boostIntensity - 2.0 * dt); // drops in 0.5s
    }

    // Effective speed scales with intensity (gradual ramp, not instant 3x)
    const effectiveMultiplier = 1.0 + (CONFIG.BOOST_MULTIPLIER - 1.0) * boostIntensity;
    const effectiveMaxSpeed = boostActive ? CONFIG.MAX_SPEED * effectiveMultiplier : CONFIG.MAX_SPEED;

    // 6. Clamp speed
    velocity = Math.max(-effectiveMaxSpeed / 3, Math.min(effectiveMaxSpeed, velocity));

    // 7. Steering lerp
    const steerLerp = Math.min(1, 10 * dt);
    if (input.left) {
      steeringAngle += (-0.5 - steeringAngle) * steerLerp;
    } else if (input.right) {
      steeringAngle += (0.5 - steeringAngle) * steerLerp;
    } else {
      steeringAngle += (0 - steeringAngle) * steerLerp;
    }

    // 8. Heading
    heading += steeringAngle * (velocity / CONFIG.MAX_SPEED) * CONFIG.TURN_RATE * dt * (isAirborne ? 0.3 : 1.0);

    // 9. Position (XZ)
    position.x += Math.cos(heading) * velocity * dt;
    position.z += Math.sin(heading) * velocity * dt;

    // Terrain following + jump
    const groundHeight = getHeightAt(position.x, position.z);
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

    // 11. Wheel spin
    for (const pivot of car.wheels) {
      const wheelGroup = pivot.children[0];
      if (wheelGroup) wheelGroup.rotation.z += velocity * dt * 3;
    }

    // 12. Front wheel steering visual
    for (const pivot of car.frontWheels) {
      pivot.rotation.y = -steeringAngle;
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
      boostIntensity,
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
    boostIntensity = 0;
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
