import * as THREE from 'three';
import gsap from 'gsap';

export interface BoxWalls {
  dispose(): void;
}

/**
 * Simple dark box enclosing the gallery.
 * Camera at (0, 0.3, 4.5), panels at X=-3..+3, Y≈0..1, Z≈0.
 * Box: X=-8..+8, Y=-1..+6, Z=-5..+7
 * Each wall is a simple plane at a box face. No hinge offsets.
 * Animation: walls fall straight down (translate Y).
 */
export function createBoxWalls(scene: THREE.Scene): BoxWalls {
  const mat = () => new THREE.MeshBasicMaterial({
    color: 0x050508,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  const walls: THREE.Mesh[] = [];

  // Left wall (X=-8, vertical, facing +X)
  const leftGeo = new THREE.PlaneGeometry(12, 7);
  const left = new THREE.Mesh(leftGeo, mat());
  left.position.set(-8, 2.5, 1);
  left.rotation.y = Math.PI / 2;
  walls.push(left);

  // Right wall (X=+8, vertical, facing -X)
  const rightGeo = new THREE.PlaneGeometry(12, 7);
  const right = new THREE.Mesh(rightGeo, mat());
  right.position.set(8, 2.5, 1);
  right.rotation.y = -Math.PI / 2;
  walls.push(right);

  // Back wall (Z=-5, vertical, facing +Z)
  const backGeo = new THREE.PlaneGeometry(16, 7);
  const back = new THREE.Mesh(backGeo, mat());
  back.position.set(0, 2.5, -5);
  walls.push(back);

  // Front wall (Z=+7, behind camera, facing -Z)
  const frontGeo = new THREE.PlaneGeometry(16, 7);
  const front = new THREE.Mesh(frontGeo, mat());
  front.position.set(0, 2.5, 7);
  front.rotation.y = Math.PI;
  walls.push(front);

  // Top (Y=+6, horizontal, facing down)
  const topGeo = new THREE.PlaneGeometry(16, 12);
  const top = new THREE.Mesh(topGeo, mat());
  top.position.set(0, 6, 1);
  top.rotation.x = Math.PI / 2;
  walls.push(top);

  // Floor (Y=0.05, horizontal, just above terrain)
  const floorGeo = new THREE.PlaneGeometry(16, 12);
  const floor = new THREE.Mesh(floorGeo, mat());
  floor.position.set(0, 0.05, 1);
  floor.rotation.x = -Math.PI / 2;
  walls.push(floor);

  for (const w of walls) scene.add(w);

  function dispose() {
    for (const w of walls) {
      scene.remove(w);
      w.geometry.dispose();
      (w.material as THREE.Material).dispose();
    }
  }

  return { dispose };
}

/**
 * Walls fall away from center: left slides left, right slides right,
 * top flies up, back slides back, front fades, floor stays then fades.
 * Simple translations — no complex hinge math.
 */
export function createWallOpenTimeline(_box: BoxWalls, scene: THREE.Scene): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Find wall meshes by position (they were added to scene)
  const meshes = scene.children.filter(
    c => c instanceof THREE.Mesh && (c.material as THREE.MeshBasicMaterial).color?.getHex() === 0x050508
  ) as THREE.Mesh[];

  for (const m of meshes) {
    const pos = m.position;

    if (pos.x < -5) {
      // Left wall → slide left and down
      tl.to(pos, { x: pos.x - 12, y: -8, duration: 2.5, ease: 'power2.in' }, 0);
    } else if (pos.x > 5) {
      // Right wall → slide right and down
      tl.to(pos, { x: pos.x + 12, y: -8, duration: 2.5, ease: 'power2.in' }, 0.1);
    } else if (pos.z < -3) {
      // Back wall → slide back and down
      tl.to(pos, { z: pos.z - 12, y: -8, duration: 2.5, ease: 'power2.in' }, 0.2);
    } else if (pos.z > 6) {
      // Front wall → fade out quickly
      const frontMat = m.material as THREE.MeshBasicMaterial;
      frontMat.transparent = true;
      tl.to(frontMat, { opacity: 0, duration: 0.5 }, 0);
    } else if (pos.y > 5) {
      // Top → fly up
      tl.to(pos, { y: pos.y + 15, duration: 2.0, ease: 'power2.in' }, 0.15);
    } else if (pos.y < 0.1) {
      // Floor → fade out after walls are gone
      const floorMat = m.material as THREE.MeshBasicMaterial;
      floorMat.transparent = true;
      tl.to(floorMat, { opacity: 0, duration: 1.0 }, 2.0);
    }
  }

  return tl;
}
