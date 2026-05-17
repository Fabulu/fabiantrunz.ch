import * as THREE from "three";

export interface DrivingLightRig {
  sun: THREE.DirectionalLight;
  hemisphere: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
  dispose(): void;
}

export function createDrivingLighting(scene: THREE.Scene): DrivingLightRig {
  const sun = new THREE.DirectionalLight(0xfff8e0, 2.0);
  sun.position.set(10, 15, 5);
  sun.target.position.set(0, 0, 0);
  scene.add(sun);
  scene.add(sun.target);

  const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 1.2);
  scene.add(hemisphere);

  const ambient = new THREE.AmbientLight(0x334455, 0.3);
  scene.add(ambient);

  function dispose(): void {
    scene.remove(sun.target);
    scene.remove(sun);
    scene.remove(hemisphere);
    scene.remove(ambient);
    sun.dispose();
    hemisphere.dispose();
    ambient.dispose();
  }

  return { sun, hemisphere, ambient, dispose };
}
