import * as THREE from 'three';
import gsap from 'gsap';

export interface BoxWalls {
  front: THREE.Group;
  left: THREE.Group;
  right: THREE.Group;
  top: THREE.Group;
  back: THREE.Group;
  dispose(): void;
}

function createWall(w: number, h: number): { group: THREE.Group; mesh: THREE.Mesh; material: THREE.MeshBasicMaterial } {
  const geometry = new THREE.PlaneGeometry(w, h);
  const material = new THREE.MeshBasicMaterial({
    color: 0x050508,
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  const group = new THREE.Group();
  group.add(mesh);
  return { group, mesh, material };
}

/**
 * Create a box that encloses the gallery camera (0, 0.3, 4.5) and panels (around origin).
 * Box spans: X=-7..+7, Y=-4..+5, Z=-3..+6
 * Camera at Z=4.5 is inside. Panels at Z≈0 are inside.
 */
export function createBoxWalls(scene: THREE.Scene): BoxWalls {
  // Back wall: behind panels, facing camera (Z=-3)
  const back = createWall(14, 9);
  back.group.position.set(0, 0.5, -3);

  // Left: hinge at left edge (X=-7)
  const left = createWall(9, 9);
  left.group.position.set(-7, 0.5, 1.5);
  left.group.rotation.y = Math.PI / 2;
  // Offset mesh so hinge is at the edge
  left.mesh.position.x = 4.5;

  // Right: hinge at right edge (X=+7)
  const right = createWall(9, 9);
  right.group.position.set(7, 0.5, 1.5);
  right.group.rotation.y = -Math.PI / 2;
  right.mesh.position.x = -4.5;

  // Top: hinge at back edge (Y=+5)
  const top = createWall(14, 9);
  top.group.position.set(0, 5, 1.5);
  top.group.rotation.x = Math.PI / 2;
  top.mesh.position.y = -4.5;

  // Front: behind the camera (Z=+6), not really visible but completes enclosure
  const front = createWall(14, 9);
  front.group.position.set(0, 0.5, 6);
  front.group.rotation.y = Math.PI;

  scene.add(back.group, left.group, right.group, top.group, front.group);

  function dispose() {
    const walls = [front, left, right, top, back];
    for (const wall of walls) {
      scene.remove(wall.group);
      wall.mesh.geometry.dispose();
      wall.material.dispose();
    }
  }

  return {
    front: front.group,
    left: left.group,
    right: right.group,
    top: top.group,
    back: back.group,
    dispose,
  };
}

/** Returns a GSAP timeline for the wall opening. Caller embeds at desired offset. */
export function createWallOpenTimeline(walls: BoxWalls): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Left: rotate outward (hinge at left edge)
  tl.to(walls.left.rotation, {
    y: Math.PI,
    duration: 2.5,
    ease: 'power1.inOut',
  }, 0);

  // Right: rotate outward (hinge at right edge)
  tl.to(walls.right.rotation, {
    y: -Math.PI,
    duration: 2.5,
    ease: 'power1.inOut',
  }, 0);

  // Top: rotate up (hinge at back edge)
  const topMaterial = (walls.top.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
  tl.call(() => { topMaterial.transparent = true; }, undefined, 0.3);
  tl.to(walls.top.rotation, {
    x: Math.PI,
    duration: 2.2,
    ease: 'power1.inOut',
  }, 0.3);
  tl.to(topMaterial, {
    opacity: 0,
    duration: 2.0,
  }, 0.5);

  // Back: fade out
  const backMaterial = (walls.back.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
  tl.call(() => { backMaterial.transparent = true; }, undefined, 0.5);
  tl.to(backMaterial, {
    opacity: 0,
    duration: 2.0,
  }, 0.5);

  // Front (behind camera): just remove quickly
  const frontMaterial = (walls.front.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
  tl.call(() => { frontMaterial.transparent = true; }, undefined, 0);
  tl.to(frontMaterial, {
    opacity: 0,
    duration: 1.0,
  }, 0);

  return tl;
}
