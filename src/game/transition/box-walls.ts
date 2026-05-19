import * as THREE from 'three';
import gsap from 'gsap';

export interface BoxWalls {
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
 * Dark box enclosing the gallery.
 * Camera at (0, 0.3, 4.5), car at ~(0, 0, 1), panels at Z≈0.
 * Walls fall over on their bottom hinge (90° rotation).
 */
export function createBoxWalls(scene: THREE.Scene): BoxWalls {
  const allGroups: THREE.Group[] = [];
  const allMaterials: THREE.MeshBasicMaterial[] = [];
  const allGeometries: THREE.BufferGeometry[] = [];

  function addHingeWall(
    px: number, py: number, pz: number,  // pivot (bottom edge)
    w: number, h: number,                // wall size
    faceRotY: number,                     // initial rotation to face correct direction
  ): THREE.Group {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = wallMat();
    const mesh = new THREE.Mesh(geo, mat);
    // Offset mesh so bottom edge is at group origin
    mesh.position.y = h / 2;

    const group = new THREE.Group();
    group.position.set(px, py, pz);
    group.rotation.y = faceRotY;
    group.add(mesh);
    scene.add(group);

    allGroups.push(group);
    allMaterials.push(mat);
    allGeometries.push(geo);
    return group;
  }

  // Left wall: hinge at bottom-left, faces inward (+X)
  const left = addHingeWall(-10, -1, 1, 16, 8, Math.PI / 2);

  // Right wall: hinge at bottom-right, faces inward (-X)
  const right = addHingeWall(10, -1, 1, 16, 8, -Math.PI / 2);

  // Back wall: hinge at bottom, faces camera (+Z)
  const back = addHingeWall(0, -1, -6, 20, 8, 0);

  // Top: flat at Y=7, just fades (no hinge)
  const topGeo = new THREE.PlaneGeometry(20, 16);
  const topMat = wallMat();
  const topMesh = new THREE.Mesh(topGeo, topMat);
  topMesh.position.set(0, 7, 1);
  topMesh.rotation.x = Math.PI / 2;
  scene.add(topMesh);
  allGeometries.push(topGeo);
  allMaterials.push(topMat);

  // Front: behind camera (Z=+10), just fades
  const frontGeo = new THREE.PlaneGeometry(20, 8);
  const frontMat = wallMat();
  const frontMesh = new THREE.Mesh(frontGeo, frontMat);
  frontMesh.position.set(0, 3, 10);
  frontMesh.rotation.y = Math.PI;
  scene.add(frontMesh);
  allGeometries.push(frontGeo);
  allMaterials.push(frontMat);

  // Floor: Y=0.3 (above terrain noise)
  const floorGeo = new THREE.PlaneGeometry(24, 20);
  const floorMat = wallMat();
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.set(0, 0.3, 1);
  floorMesh.rotation.x = -Math.PI / 2;
  scene.add(floorMesh);
  allGeometries.push(floorGeo);
  allMaterials.push(floorMat);

  function dispose() {
    for (const g of allGroups) scene.remove(g);
    scene.remove(topMesh);
    scene.remove(frontMesh);
    scene.remove(floorMesh);
    for (const g of allGeometries) g.dispose();
    for (const m of allMaterials) m.dispose();
  }

  return { dispose, _left: left, _right: right, _back: back, _top: topMesh, _front: frontMesh, _floor: floorMesh } as BoxWalls;
}

/** Walls fall over on their bottom hinge (90° rotation outward). Slow and heavy. */
export function createWallOpenTimeline(box: BoxWalls, _scene: THREE.Scene): gsap.core.Timeline {
  const tl = gsap.timeline();
  const b = box as BoxWalls & { _left: THREE.Group; _right: THREE.Group; _back: THREE.Group; _top: THREE.Mesh; _front: THREE.Mesh; _floor: THREE.Mesh };

  // Left wall: falls outward to the left (rotate around Z axis)
  // The group faces +X (rotation.y=PI/2). Falling outward = rotating group.rotation.z by -PI/2
  tl.to(b._left.rotation, {
    z: -Math.PI / 2,
    duration: 4.5,
    ease: 'bounce.out',
  }, 0);

  // Right wall: falls outward to the right
  tl.to(b._right.rotation, {
    z: Math.PI / 2,
    duration: 4.5,
    ease: 'bounce.out',
  }, 0.15);

  // Back wall: falls backward (rotate around X axis)
  tl.to(b._back.rotation, {
    x: -Math.PI / 2,
    duration: 4.5,
    ease: 'bounce.out',
  }, 0.3);

  // Top: fly up and fade
  topFade(tl, b._top);

  // Front (behind camera): fade quickly
  frontFade(tl, b._front);

  // Floor: fade after walls have fallen
  floorFade(tl, b._floor);

  return tl;
}

function topFade(tl: gsap.core.Timeline, mesh: THREE.Mesh): void {
  const mat = mesh.material as THREE.MeshBasicMaterial;
  mat.transparent = true;
  tl.to(mesh.position, { y: 15, duration: 3.0, ease: 'power1.in' }, 0.2);
  tl.to(mat, { opacity: 0, duration: 2.5 }, 0.5);
}

function frontFade(tl: gsap.core.Timeline, mesh: THREE.Mesh): void {
  const mat = mesh.material as THREE.MeshBasicMaterial;
  mat.transparent = true;
  tl.to(mat, { opacity: 0, duration: 0.8 }, 0);
}

function floorFade(tl: gsap.core.Timeline, mesh: THREE.Mesh): void {
  const mat = mesh.material as THREE.MeshBasicMaterial;
  mat.transparent = true;
  tl.to(mat, { opacity: 0, duration: 1.5 }, 4.0);
}
