import RAPIER from '@dimforge/rapier3d-compat';
import type { Vector3 } from 'three';
import type { PhysicsWorld } from './rapier-world';
import { getHeightAt } from '../environment/terrain';

export interface CarColliderState {
  body: RAPIER.RigidBody;
  syncFromPhysics(position: Vector3, heading: number): void;
  dispose(): void;
}

export function createCarCollider(physics: PhysicsWorld): CarColliderState {
  const startY = getHeightAt(0, 0);

  // Box collider matching car dimensions (3x1x1.4 -> half-extents 1.5, 0.5, 0.7)
  const colliderDesc = RAPIER.ColliderDesc.cuboid(1.5, 0.5, 0.7)
    .setRestitution(0.2)
    .setFriction(0.5);

  const { body } = physics.addKinematicBody(
    { x: 0, y: startY + 0.5, z: 0 },
    colliderDesc,
  );

  function syncFromPhysics(position: Vector3, heading: number): void {
    physics.setKinematicPosition(body, position, heading);
  }

  function dispose(): void {
    physics.world.removeRigidBody(body);
  }

  return { body, syncFromPhysics, dispose };
}
