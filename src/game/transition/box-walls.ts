import * as THREE from 'three';
import gsap from 'gsap';

export interface BoxWalls {
  left: THREE.Group;
  right: THREE.Group;
  back: THREE.Group;
  frontHinge: THREE.Group;
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
  m.toneMapped = false;
  return m;
}

/**
 * Proportional box around gallery.
 * Camera at (0, 1.8, 4.5), car at (0, 0, 8), panels at Z≈0.
 * Box is roughly cubic: 8 wide × 8 tall × 14 deep.
 * All walls same thickness, proportional feel.
 */
export function createBoxWalls(scene: THREE.Scene, wallColor: number = 0x050508): BoxWalls {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.MeshBasicMaterial[] = [];
  function track(g: THREE.BufferGeometry, m: THREE.MeshBasicMaterial) { geos.push(g); mats.push(m); }

  // Box dimensions
  const W = 4;   // half-width (X = ±4)
  const H = 8;   // height
  const D = 14;  // depth (Z range)
  const Z0 = -1; // back Z
  const ZM = Z0 + D / 2; // center Z = 6
  const Y0 = 0.15; // bottom Y (just above terrain)

  // LEFT wall — hinge at bottom, mesh faces inward (+X)
  const leftGeo = new THREE.PlaneGeometry(D, H);
  const leftMat = wallMat(wallColor);
  const leftMesh = new THREE.Mesh(leftGeo, leftMat);
  leftMesh.rotation.y = Math.PI / 2;
  leftMesh.position.y = H / 2;
  const left = new THREE.Group();
  left.position.set(-W, Y0, ZM);
  left.add(leftMesh);
  scene.add(left);
  track(leftGeo, leftMat);

  // RIGHT wall — hinge at bottom, mesh faces inward (-X)
  const rightGeo = new THREE.PlaneGeometry(D, H);
  const rightMat = wallMat(wallColor);
  const rightMesh = new THREE.Mesh(rightGeo, rightMat);
  rightMesh.rotation.y = -Math.PI / 2;
  rightMesh.position.y = H / 2;
  const right = new THREE.Group();
  right.position.set(W, Y0, ZM);
  right.add(rightMesh);
  scene.add(right);
  track(rightGeo, rightMat);

  // BACK wall — hinge at bottom, faces +Z
  const backGeo = new THREE.PlaneGeometry(W * 2, H);
  const backMat = wallMat(wallColor);
  const backMesh = new THREE.Mesh(backGeo, backMat);
  backMesh.position.y = H / 2;
  const back = new THREE.Group();
  back.position.set(0, Y0, Z0);
  back.add(backMesh);
  scene.add(back);
  track(backGeo, backMat);

  // TOP — flat ceiling
  const topGeo = new THREE.PlaneGeometry(W * 2, D);
  const topMat = wallMat(wallColor);
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.set(0, Y0 + H, ZM);
  top.rotation.x = Math.PI / 2;
  scene.add(top);
  track(topGeo, topMat);

  // FRONT HINGE — at Z=Z0+D, drops forward (mirrored back wall)
  const frontHingeGeo = new THREE.PlaneGeometry(W * 2, H);
  const frontHingeMat = wallMat(wallColor);
  const frontHingeMesh = new THREE.Mesh(frontHingeGeo, frontHingeMat);
  frontHingeMesh.rotation.y = Math.PI; // faces -Z (inward)
  frontHingeMesh.position.y = H / 2;
  const frontHinge = new THREE.Group();
  frontHinge.position.set(0, Y0, Z0 + D);
  frontHinge.add(frontHingeMesh);
  scene.add(frontHinge);
  track(frontHingeGeo, frontHingeMat);

  // FRONT FADE — extra coverage behind camera, just fades
  const frontGeo = new THREE.PlaneGeometry(W * 2 + 4, H);
  const frontMat = wallMat(wallColor);
  const front = new THREE.Mesh(frontGeo, frontMat);
  front.position.set(0, Y0 + H / 2, Z0 + D + 0.1);
  front.rotation.y = Math.PI;
  scene.add(front);
  track(frontGeo, frontMat);

  // FLOOR
  const floorGeo = new THREE.PlaneGeometry(W * 2, D); // exact match to box footprint
  const floorMat = wallMat(wallColor);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, Y0, ZM);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  track(floorGeo, floorMat);

  function dispose() {
    scene.remove(left, right, back, frontHinge, top, front, floor);
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
  }

  return { left, right, back, frontHinge, top, front, floor, dispose };
}

/** Walls fall outward on bottom hinge. Stay on ground. */
export function createWallOpenTimeline(box: BoxWalls): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Left falls outward (z: +PI/2)
  tl.to(box.left.rotation, { z: Math.PI / 2, duration: 4.5, ease: 'power2.in' }, 0);

  // Right falls outward (z: -PI/2)
  tl.to(box.right.rotation, { z: -Math.PI / 2, duration: 4.5, ease: 'power2.in' }, 0.2);

  // Back falls backward (x: -PI/2)
  tl.to(box.back.rotation, { x: -Math.PI / 2, duration: 4.5, ease: 'power2.in' }, 0.4);

  // Front hinge falls forward (x: +PI/2, mirrored back)
  tl.to(box.frontHinge.rotation, { x: Math.PI / 2, duration: 4.5, ease: 'power2.in' }, 0.3);

  // Top flies up
  tl.to(box.top.position, { y: 30, duration: 4.0, ease: 'power1.in' }, 0.3);

  // Front fades (behind camera)
  const fm = box.front.material as THREE.MeshBasicMaterial;
  fm.transparent = true;
  tl.to(fm, { opacity: 0, duration: 0.8 }, 0);

  return tl;
}
