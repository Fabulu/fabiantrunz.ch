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

  // Left wall: hinge at OUTER edge (X=-14), falls outward (away from car)
  // Pivot at X=-14, mesh offset inward by +14 so the face spans X=-14..+14
  const left = createWall(18, 18);
  left.group.position.set(-14, 1, 3);
  left.group.rotation.y = Math.PI / 2;
  left.mesh.position.x = 9;

  // Right wall: hinge at OUTER edge (X=+14), falls outward
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

  // Floor: black ground inside the box
  const floor = createWall(28, 18);
  floor.group.position.set(0, -0.01, 3);
  floor.group.rotation.x = -Math.PI / 2;

  scene.add(back.group, left.group, right.group, top.group, front.group, floor.group);

  function dispose() {
    const all = [front, left, right, top, back, floor];
    for (const wall of all) {
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

  // Left: falls OUTWARD (to the left, away from center)
  // Currently at rotation.y = PI/2. Falling outward = rotating to 0 (flat on ground facing left)
  tl.to(walls.left.rotation, {
    y: 0,
    duration: 3.0,
    ease: 'bounce.out',
  }, 0);

  // Right: falls OUTWARD (to the right, away from center)
  // Currently at rotation.y = -PI/2. Falling outward = rotating to 0
  tl.to(walls.right.rotation, {
    y: 0,
    duration: 3.0,
    ease: 'bounce.out',
  }, 0.1);

  // Top: falls backward (away from camera)
  tl.to(walls.top.rotation, {
    x: 0,
    duration: 2.5,
    ease: 'bounce.out',
  }, 0.2);

  // Back: falls backward (hinge at bottom, drops away)
  tl.to(walls.back.rotation, {
    x: -Math.PI / 2,
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
