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

function wallMat(color: number): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  m.toneMapped = false; // bypass ACES tone mapping — keep pure white/black
  return m;
}

/**
 * Box enclosing gallery + car behind camera.
 * Camera at (0,0.3,4.5), panels at Z≈0, car at Z=8.
 * Chase cam settles at Z=16. Box: X=-15..+15, Y=0..+10, Z=-8..+20
 * Wall pivots at Y=0 so fallen walls rest on terrain (which is flat near origin).
 */
export function createBoxWalls(scene: THREE.Scene, wallColor: number = 0x050508): BoxWalls {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.MeshBasicMaterial[] = [];
  function track(g: THREE.BufferGeometry, m: THREE.MeshBasicMaterial) { geos.push(g); mats.push(m); }

  // LEFT wall — pivot at bottom edge, no group rotation (mesh rotated inside)
  const leftGeo = new THREE.PlaneGeometry(28, 10);
  const leftMat = wallMat(wallColor);
  const leftMesh = new THREE.Mesh(leftGeo, leftMat);
  leftMesh.rotation.y = Math.PI / 2;
  leftMesh.position.y = 5;
  const left = new THREE.Group();
  left.position.set(-15, 0.15, 6);
  left.add(leftMesh);
  scene.add(left);
  track(leftGeo, leftMat);

  // RIGHT wall
  const rightGeo = new THREE.PlaneGeometry(28, 10);
  const rightMat = wallMat(wallColor);
  const rightMesh = new THREE.Mesh(rightGeo, rightMat);
  rightMesh.rotation.y = -Math.PI / 2;
  rightMesh.position.y = 5;
  const right = new THREE.Group();
  right.position.set(15, 0.15, 6);
  right.add(rightMesh);
  scene.add(right);
  track(rightGeo, rightMat);

  // BACK wall — pivot at bottom, faces +Z
  const backGeo = new THREE.PlaneGeometry(30, 10);
  const backMat = wallMat(wallColor);
  const backMesh = new THREE.Mesh(backGeo, backMat);
  backMesh.position.y = 5;
  const back = new THREE.Group();
  back.position.set(0, 0.15, -8);
  back.add(backMesh);
  scene.add(back);
  track(backGeo, backMat);

  // TOP
  const topGeo = new THREE.PlaneGeometry(30, 28);
  const topMat = wallMat(wallColor);
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(0, 10, 6);
  top.rotation.x = Math.PI / 2;
  scene.add(top);
  track(topGeo, topMat);

  // FRONT — behind chase cam (Z=20), fades
  const frontGeo = new THREE.PlaneGeometry(30, 10);
  const frontMat = wallMat(wallColor);
  const front = new THREE.Mesh(frontGeo, frontMat);
  front.position.set(0, 5, 20);
  front.rotation.y = Math.PI;
  scene.add(front);
  track(frontGeo, frontMat);

  // FLOOR — Y=0.1 (terrain is flat at origin)
  const floorGeo = new THREE.PlaneGeometry(34, 32);
  const floorMat = wallMat(wallColor);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, 0.15, 6);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  track(floorGeo, floorMat);

  function dispose() {
    scene.remove(left, right, back, top, front, floor);
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
  }

  return { left, right, back, top, front, floor, dispose };
}

/** Walls fall outward on bottom hinge. Stay on ground. */
export function createWallOpenTimeline(box: BoxWalls): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Left falls outward
  tl.to(box.left.rotation, { z: -Math.PI / 2, duration: 4.5, ease: 'power2.in' }, 0);

  // Right falls outward
  tl.to(box.right.rotation, { z: Math.PI / 2, duration: 4.5, ease: 'power2.in' }, 0.2);

  // Back falls backward
  tl.to(box.back.rotation, { x: -Math.PI / 2, duration: 4.5, ease: 'power2.in' }, 0.4);

  // Top flies up
  tl.to(box.top.position, { y: 30, duration: 4.0, ease: 'power1.in' }, 0.3);

  // Front fades (behind camera, never seen)
  const fm = box.front.material as THREE.MeshBasicMaterial;
  fm.transparent = true;
  tl.to(fm, { opacity: 0, duration: 0.5 }, 0);

  // Floor stays permanently

  return tl;
}
