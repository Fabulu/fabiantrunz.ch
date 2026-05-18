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

function createWall(): { group: THREE.Group; mesh: THREE.Mesh; material: THREE.MeshBasicMaterial } {
  const geometry = new THREE.PlaneGeometry(12, 8);
  const material = new THREE.MeshBasicMaterial({
    color: 0x050508,
    transparent: false,
    depthWrite: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  const group = new THREE.Group();
  group.add(mesh);
  return { group, mesh, material };
}

export function createBoxWalls(scene: THREE.Scene): BoxWalls {
  // Front: hinge at bottom edge
  const front = createWall();
  front.group.position.set(0, -4, 0);
  front.mesh.position.y = 4;

  // Left: hinge at left edge
  const left = createWall();
  left.group.position.set(-6, 0, 0);
  left.mesh.position.x = 6;

  // Right: hinge at right edge
  const right = createWall();
  right.group.position.set(6, 0, 0);
  right.mesh.position.x = -6;

  // Top: hinge at top edge
  const top = createWall();
  top.group.position.set(0, 4, 0);
  top.mesh.position.y = -4;

  // Back: no offset, just fades
  const back = createWall();
  back.group.position.set(0, 0, -6);

  scene.add(front.group, left.group, right.group, top.group, back.group);

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

  // Front: rotate down slowly (hinge at bottom)
  tl.to(walls.front.rotation, {
    x: -Math.PI / 2,
    duration: 2.3,
    ease: 'power1.inOut',
  }, 0);

  // Left: rotate outward (hinge at left)
  tl.to(walls.left.rotation, {
    y: Math.PI / 2,
    duration: 2.3,
    ease: 'power1.inOut',
  }, 0.15);

  // Right: rotate outward (hinge at right)
  tl.to(walls.right.rotation, {
    y: -Math.PI / 2,
    duration: 2.3,
    ease: 'power1.inOut',
  }, 0.15);

  // Top: rotate up (hinge at top) + fade
  const topMaterial = (walls.top.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
  tl.call(() => { topMaterial.transparent = true; }, undefined, 0.3);
  tl.to(walls.top.rotation, {
    x: Math.PI / 2,
    duration: 2.0,
    ease: 'power1.inOut',
  }, 0.3);
  tl.to(topMaterial, {
    opacity: 0,
    duration: 2.0,
  }, 0.3);

  // Back: fade out
  const backMaterial = (walls.back.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
  tl.call(() => { backMaterial.transparent = true; }, undefined, 0.2);
  tl.to(backMaterial, {
    opacity: 0,
    duration: 2.0,
  }, 0.2);

  return tl;
}
