import * as THREE from 'three';
import gsap from 'gsap';

export interface LightingRig {
  ambient: THREE.AmbientLight;
  spot: THREE.SpotLight;
  edgeLightLeft: THREE.PointLight;
  edgeLightRight: THREE.PointLight;
  cursorLight: THREE.PointLight;
}

export function createLighting(
  scene: THREE.Scene,
  _renderer: THREE.WebGLRenderer
): LightingRig {
  // Ambient — tinted dark blue for mood in dark mode
  const ambient = new THREE.AmbientLight(0x8888aa, 0.2);
  scene.add(ambient);

  // Gallery spotlight from above — warm, focused
  const spot = new THREE.SpotLight(0xffe4c4, 0.5);
  spot.position.set(0, 5, 3);
  spot.target.position.set(0, 0, 0);
  spot.angle = Math.PI / 4;
  spot.penumbra = 0.6;
  spot.decay = 2;
  scene.add(spot);
  scene.add(spot.target);

  // Warm amber edge lights for depth
  const edgeLightLeft = new THREE.PointLight(0xf59e0b, 0.3, 20);
  edgeLightLeft.position.set(-5, 1, -2);
  scene.add(edgeLightLeft);

  const edgeLightRight = new THREE.PointLight(0xf59e0b, 0.3, 20);
  edgeLightRight.position.set(5, 1, -2);
  scene.add(edgeLightRight);

  // Cursor-following light — the main illumination source
  const cursorLight = new THREE.PointLight(0xffffff, 2.5, 15);
  cursorLight.position.set(0, 0.3, 3.5); // starts at camera position
  scene.add(cursorLight);

  // Dark background
  scene.background = new THREE.Color(0x050508);

  // No environment map — colorSpace + toneMapped fixes handle the rest
  scene.environment = null;

  return { ambient, spot, edgeLightLeft, edgeLightRight, cursorLight };
}

export function transitionLighting(
  rig: LightingRig,
  scene: THREE.Scene,
  theme: 'light' | 'dark',
  overrideDuration?: number
): void {
  const duration = overrideDuration ?? 0.8;
  const ease = 'power2.inOut';

  if (theme === 'light') {
    const bgTarget = new THREE.Color(0xf5f5f8);
    gsap.to((scene.background as THREE.Color), { r: bgTarget.r, g: bgTarget.g, b: bgTarget.b, duration, ease });

    // Bright, even lighting
    gsap.to(rig.ambient, { intensity: 1.0, duration, ease });
    gsap.to(rig.ambient.color, { r: 1, g: 1, b: 1, duration, ease });
    gsap.to(rig.spot, { intensity: 0.8, duration, ease });
    gsap.to(rig.spot.color, { r: 1, g: 1, b: 1, duration, ease });
    gsap.to(rig.edgeLightLeft, { intensity: 0, duration, ease });
    gsap.to(rig.edgeLightRight, { intensity: 0, duration, ease });
    gsap.to(rig.cursorLight, { intensity: 0.8, duration, ease });
  } else {
    const bgTarget = new THREE.Color(0x050508);
    gsap.to((scene.background as THREE.Color), { r: bgTarget.r, g: bgTarget.g, b: bgTarget.b, duration, ease });

    // Moody gallery lighting
    const ambientTarget = new THREE.Color(0x1a1a2e);
    gsap.to(rig.ambient, { intensity: 0.4, duration, ease });
    gsap.to(rig.ambient.color, { r: ambientTarget.r, g: ambientTarget.g, b: ambientTarget.b, duration, ease });
    gsap.to(rig.spot, { intensity: 1.5, duration, ease });
    const spotTarget = new THREE.Color(0xffe4c4);
    gsap.to(rig.spot.color, { r: spotTarget.r, g: spotTarget.g, b: spotTarget.b, duration, ease });
    gsap.to(rig.edgeLightLeft, { intensity: 0.3, duration, ease });
    gsap.to(rig.edgeLightRight, { intensity: 0.3, duration, ease });
    gsap.to(rig.cursorLight, { intensity: 2.5, duration, ease });
  }
}
