import * as THREE from 'three';
import gsap from 'gsap';

export interface BoxWalls {
  left: THREE.Group;
  right: THREE.Group;
  back: THREE.Group;
  top: THREE.Mesh;
  front: THREE.Mesh;
  floor: THREE.Mesh;
  dispose(): void;
}

function wallMat(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0x050508,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
}

/**
 * Box enclosing gallery. Camera at (0,0.3,4.5), car at (0,0,3), panels at Z≈0.
 * Box: X=-12..+12, Y=-1..+8, Z=-7..+14
 *
 * Hinge walls: group has NO initial rotation. Mesh is rotated inside the group
 * so that animating group.rotation.z (for left/right) or group.rotation.x (for back)
 * works in WORLD axes without Euler compounding issues.
 */
export function createBoxWalls(scene: THREE.Scene): BoxWalls {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.MeshBasicMaterial[] = [];

  function tracked(geo: THREE.BufferGeometry, mat: THREE.MeshBasicMaterial): void {
    geos.push(geo);
    mats.push(mat);
  }

  // LEFT wall — pivot at (-12, -1, 1), mesh faces +X
  const leftGeo = new THREE.PlaneGeometry(20, 9);
  const leftMat = wallMat();
  const leftMesh = new THREE.Mesh(leftGeo, leftMat);
  leftMesh.rotation.y = Math.PI / 2; // face +X (inward)
  leftMesh.position.y = 4.5; // offset from pivot (half height)
  const left = new THREE.Group();
  left.position.set(-12, -1, 1);
  left.add(leftMesh);
  scene.add(left);
  tracked(leftGeo, leftMat);

  // RIGHT wall — pivot at (+12, -1, 1), mesh faces -X
  const rightGeo = new THREE.PlaneGeometry(20, 9);
  const rightMat = wallMat();
  const rightMesh = new THREE.Mesh(rightGeo, rightMat);
  rightMesh.rotation.y = -Math.PI / 2; // face -X (inward)
  rightMesh.position.y = 4.5;
  const right = new THREE.Group();
  right.position.set(12, -1, 1);
  right.add(rightMesh);
  scene.add(right);
  tracked(rightGeo, rightMat);

  // BACK wall — pivot at (0, -1, -7), mesh faces +Z
  const backGeo = new THREE.PlaneGeometry(24, 9);
  const backMat = wallMat();
  const backMesh = new THREE.Mesh(backGeo, backMat);
  // No Y rotation needed — PlaneGeometry faces +Z by default
  backMesh.position.y = 4.5;
  const back = new THREE.Group();
  back.position.set(0, -1, -7);
  back.add(backMesh);
  scene.add(back);
  tracked(backGeo, backMat);

  // TOP — flat ceiling, flies up
  const topGeo = new THREE.PlaneGeometry(24, 21);
  const topMat = wallMat();
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(0, 8, 3);
  top.rotation.x = Math.PI / 2;
  scene.add(top);
  tracked(topGeo, topMat);

  // FRONT — behind camera, fades
  const frontGeo = new THREE.PlaneGeometry(24, 9);
  const frontMat = wallMat();
  const front = new THREE.Mesh(frontGeo, frontMat);
  front.position.set(0, 3.5, 14);
  front.rotation.y = Math.PI;
  scene.add(front);
  tracked(frontGeo, frontMat);

  // FLOOR — Y=0.3
  const floorGeo = new THREE.PlaneGeometry(28, 24);
  const floorMat = wallMat();
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, 0.3, 3);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  tracked(floorGeo, floorMat);

  function dispose() {
    scene.remove(left, right, back, top, front, floor);
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
  }

  return { left, right, back, top, front, floor, dispose };
}

/**
 * Left/right fall outward on bottom hinge. Back falls backward.
 * Top flies up. Front fades. Floor stays permanently.
 * NO fading on side/back walls — they stay as fallen scenery.
 */
export function createWallOpenTimeline(box: BoxWalls): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Left: rotate around Z axis (group has no Y rotation, so Z = world Z)
  // -PI/2 makes it fall to the left
  tl.to(box.left.rotation, {
    z: -Math.PI / 2,
    duration: 4.5,
    ease: 'power2.in',
  }, 0);

  // Right: falls to the right
  tl.to(box.right.rotation, {
    z: Math.PI / 2,
    duration: 4.5,
    ease: 'power2.in',
  }, 0.2);

  // Back: falls backward (rotate around X)
  tl.to(box.back.rotation, {
    x: -Math.PI / 2,
    duration: 4.5,
    ease: 'power2.in',
  }, 0.4);

  // Top: fly up
  tl.to(box.top.position, {
    y: 25,
    duration: 4.0,
    ease: 'power1.in',
  }, 0.3);

  // Front (behind camera): fade
  const frontMat = box.front.material as THREE.MeshBasicMaterial;
  frontMat.transparent = true;
  tl.to(frontMat, { opacity: 0, duration: 0.8 }, 0);

  // Floor: stays forever (no fade)

  return tl;
}
