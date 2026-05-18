import * as THREE from 'three';
import gsap from 'gsap';

export interface BoxWalls {
  dispose(): void;
}

/**
 * Dark box enclosing the gallery.
 * Camera at (0, 0.3, 4.5), car at (0, 0, 2), panels at X=-3..+3, Z≈0.
 * Box: X=-10..+10, Y=-1..+7, Z=-6..+10
 * Floor at Y=0.3 (above all terrain noise).
 */
export function createBoxWalls(scene: THREE.Scene): BoxWalls {
  const mat = () => new THREE.MeshBasicMaterial({
    color: 0x050508,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  const meshes: THREE.Mesh[] = [];

  // Left wall (X=-10)
  const left = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), mat());
  left.position.set(-10, 3, 2);
  left.rotation.y = Math.PI / 2;
  meshes.push(left);

  // Right wall (X=+10)
  const right = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), mat());
  right.position.set(10, 3, 2);
  right.rotation.y = -Math.PI / 2;
  meshes.push(right);

  // Back wall (Z=-6)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), mat());
  back.position.set(0, 3, -6);
  meshes.push(back);

  // Front wall (Z=+10, behind camera)
  const front = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), mat());
  front.position.set(0, 3, 10);
  front.rotation.y = Math.PI;
  meshes.push(front);

  // Top (Y=7)
  const top = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), mat());
  top.position.set(0, 7, 2);
  top.rotation.x = Math.PI / 2;
  meshes.push(top);

  // Floor (Y=0.3, above terrain noise which peaks at ~0.12)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 20), mat());
  floor.position.set(0, 0.3, 2);
  floor.rotation.x = -Math.PI / 2;
  meshes.push(floor);

  for (const m of meshes) scene.add(m);

  function dispose() {
    for (const m of meshes) {
      scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  }

  return { dispose };
}

/**
 * Walls slide outward SLOWLY (4-5s) and stay visible.
 * Left/right slide outward, top flies up, back slides back.
 * Front fades (behind camera). Floor fades last.
 */
export function createWallOpenTimeline(_box: BoxWalls, scene: THREE.Scene): gsap.core.Timeline {
  const tl = gsap.timeline();

  // Find dark wall meshes in scene
  const darkMeshes = scene.children.filter(
    c => c instanceof THREE.Mesh &&
      (c.material as THREE.MeshBasicMaterial).color?.getHex() === 0x050508
  ) as THREE.Mesh[];

  for (const m of darkMeshes) {
    const p = m.position;

    if (p.x < -8) {
      // Left → slide left slowly
      tl.to(p, { x: p.x - 15, duration: 4.5, ease: 'power1.in' }, 0);
    } else if (p.x > 8) {
      // Right → slide right slowly
      tl.to(p, { x: p.x + 15, duration: 4.5, ease: 'power1.in' }, 0.1);
    } else if (p.z < -4) {
      // Back → slide back slowly
      tl.to(p, { z: p.z - 15, duration: 4.5, ease: 'power1.in' }, 0.2);
    } else if (p.z > 8) {
      // Front (behind camera) → fade quickly
      const fm = m.material as THREE.MeshBasicMaterial;
      fm.transparent = true;
      tl.to(fm, { opacity: 0, duration: 0.8 }, 0);
    } else if (p.y > 6) {
      // Top → fly up slowly
      tl.to(p, { y: p.y + 20, duration: 4.0, ease: 'power1.in' }, 0.15);
    } else if (p.y < 1) {
      // Floor → fade out after walls gone
      const flm = m.material as THREE.MeshBasicMaterial;
      flm.transparent = true;
      tl.to(flm, { opacity: 0, duration: 1.5 }, 3.5);
    }
  }

  return tl;
}
