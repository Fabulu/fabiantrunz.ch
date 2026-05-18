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
 * Box encloses gallery camera (0, 0.3, 4.5) and panels (around origin).
 * Doubled size: X=-14..+14, Y=-8..+10, Z=-6..+12
 */
export function createBoxWalls(scene: THREE.Scene): BoxWalls {
  // Back wall: behind panels (Z=-6)
  const back = createWall(28, 18);
  back.group.position.set(0, 1, -6);

  // Left: hinge at left edge (X=-14)
  const left = createWall(18, 18);
  left.group.position.set(-14, 1, 3);
  left.group.rotation.y = Math.PI / 2;
  left.mesh.position.x = 9; // offset so hinge is at the edge

  // Right: hinge at right edge (X=+14)
  const right = createWall(18, 18);
  right.group.position.set(14, 1, 3);
  right.group.rotation.y = -Math.PI / 2;
  right.mesh.position.x = -9;

  // Top: hinge at back edge (Y=+10)
  const top = createWall(28, 18);
  top.group.position.set(0, 10, 3);
  top.group.rotation.x = Math.PI / 2;
  top.mesh.position.y = -9;

  // Front: behind the camera (Z=+12)
  const front = createWall(28, 18);
  front.group.position.set(0, 1, 12);
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

/** Walls DROP open and stay visible on the ground. No fading. */
export function createWallOpenTimeline(walls: BoxWalls): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Left: hinge outward (falls to the left)
  tl.to(walls.left.rotation, {
    y: Math.PI,
    duration: 3.0,
    ease: 'bounce.out',
  }, 0);

  // Right: hinge outward (falls to the right)
  tl.to(walls.right.rotation, {
    y: -Math.PI,
    duration: 3.0,
    ease: 'bounce.out',
  }, 0.1);

  // Top: drops backward
  tl.to(walls.top.rotation, {
    x: Math.PI,
    duration: 2.5,
    ease: 'bounce.out',
  }, 0.2);

  // Back: drops backward (hinge at bottom)
  tl.to(walls.back.rotation, {
    x: Math.PI / 2,
    duration: 2.8,
    ease: 'bounce.out',
  }, 0.3);

  // Front (behind camera): just disappear quickly
  const frontMaterial = (walls.front.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
  tl.call(() => { frontMaterial.transparent = true; }, undefined, 0);
  tl.to(frontMaterial, {
    opacity: 0,
    duration: 0.5,
  }, 0);

  return tl;
}
