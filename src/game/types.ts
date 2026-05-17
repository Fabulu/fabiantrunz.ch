import type { Vector3, Group, MeshLambertMaterial } from 'three';

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
}

export interface CarObject {
  group: Group;
  wheels: Group[];       // length 4: FL, FR, RL, RR
  frontWheels: Group[];  // first two (FL, FR)
  bodyMaterial: MeshLambertMaterial;
}

export interface CarPhysicsState {
  position: Vector3;
  velocity: number;
  heading: number;       // radians, 0 = +X direction
  steeringAngle: number;
}

export interface GameConfig {
  MAX_SPEED: number;
  ACCELERATION: number;
  BRAKE_FORCE: number;
  FRICTION: number;
  TURN_RATE: number;
  WHEEL_BASE: number;
}

export const CONFIG: GameConfig = {
  MAX_SPEED: 20,
  ACCELERATION: 12,
  BRAKE_FORCE: 20,
  FRICTION: 0.97,
  TURN_RATE: 2.5,
  WHEEL_BASE: 2.0,
} as const;
