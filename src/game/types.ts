import type { Vector3, Group, MeshLambertMaterial } from 'three';

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  boost: boolean;
  jump: boolean;
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
  isAirborne: boolean;
  boostActive: boolean;
  boostCharge: number;   // 0..1 normalized charge level
}

export interface GameConfig {
  MAX_SPEED: number;
  ACCELERATION: number;
  BRAKE_FORCE: number;
  FRICTION: number;
  TURN_RATE: number;
  WHEEL_BASE: number;
  BOOST_MULTIPLIER: number;
  BOOST_DRAIN_RATE: number;
  BOOST_RECHARGE_RATE: number;
  BOOST_MIN_ACTIVATE: number;
  JUMP_FORCE: number;
  GRAVITY: number;
  BOOST_FOV: number;
}

export const CONFIG: GameConfig = {
  MAX_SPEED: 20,
  ACCELERATION: 12,
  BRAKE_FORCE: 20,
  FRICTION: 0.97,
  TURN_RATE: 2.5,
  WHEEL_BASE: 2.0,
  BOOST_MULTIPLIER: 3.0,
  BOOST_DRAIN_RATE: 0.4,
  BOOST_RECHARGE_RATE: 0.25,
  BOOST_MIN_ACTIVATE: 0.15,
  JUMP_FORCE: 8,
  GRAVITY: 15,
  BOOST_FOV: 80,
} as const;
