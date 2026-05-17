import RAPIER from '@dimforge/rapier3d-compat';
import type { Vector3, Object3D } from 'three';

export interface PhysicsWorld {
  world: RAPIER.World;
  step(): void;
  addDynamicBody(
    position: { x: number; y: number; z: number },
    colliderDesc: RAPIER.ColliderDesc,
    mass?: number,
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider };
  addKinematicBody(
    position: { x: number; y: number; z: number },
    colliderDesc: RAPIER.ColliderDesc,
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider };
  syncMeshToBody(mesh: Object3D, body: RAPIER.RigidBody): void;
  setKinematicPosition(
    body: RAPIER.RigidBody,
    position: Vector3,
    heading: number,
  ): void;
  dispose(): void;
}

let initialized = false;

export async function initPhysics(): Promise<PhysicsWorld> {
  if (!initialized) {
    await RAPIER.init();
    initialized = true;
  }

  const world = new RAPIER.World({ x: 0, y: -15, z: 0 });

  // Ground plane — flat collider to prevent objects falling through
  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(100, 0.1, 100).setTranslation(0, -0.1, 0),
    groundBody,
  );

  function step(): void {
    world.step();
  }

  function addDynamicBody(
    position: { x: number; y: number; z: number },
    colliderDesc: RAPIER.ColliderDesc,
    mass?: number,
  ) {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(0.8)
      .setAngularDamping(0.5);
    const body = world.createRigidBody(bodyDesc);
    if (mass !== undefined) {
      colliderDesc.setMass(mass);
    }
    const collider = world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  function addKinematicBody(
    position: { x: number; y: number; z: number },
    colliderDesc: RAPIER.ColliderDesc,
  ) {
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(position.x, position.y, position.z);
    const body = world.createRigidBody(bodyDesc);
    const collider = world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  function syncMeshToBody(mesh: Object3D, body: RAPIER.RigidBody): void {
    const t = body.translation();
    mesh.position.set(t.x, t.y, t.z);
    const r = body.rotation();
    mesh.quaternion.set(r.x, r.y, r.z, r.w);
  }

  function setKinematicPosition(
    body: RAPIER.RigidBody,
    position: Vector3,
    heading: number,
  ): void {
    body.setNextKinematicTranslation({ x: position.x, y: position.y, z: position.z });
    // heading to quaternion: rotation around Y axis by -heading
    const halfAngle = -heading / 2;
    body.setNextKinematicRotation({
      x: 0,
      y: Math.sin(halfAngle),
      z: 0,
      w: Math.cos(halfAngle),
    });
  }

  function dispose(): void {
    world.free();
  }

  return {
    world,
    step,
    addDynamicBody,
    addKinematicBody,
    syncMeshToBody,
    setKinematicPosition,
    dispose,
  };
}
