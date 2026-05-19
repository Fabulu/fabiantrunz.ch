import type { PerspectiveCamera, Group } from 'three';
import { CONFIG } from '../types';

let shakePhase = 0;

export function updateChaseCamera(
  camera: PerspectiveCamera,
  carGroup: Group,
  heading: number,
  dt: number,
  boostIntensity: number, // 0..1 (was boolean)
): void {
  // Height: drops with intensity for aggressive feel
  const idealHeight = 4 - boostIntensity;
  const heightLerp = 0.08 + boostIntensity * 0.04;

  // Ideal position: behind car by 8 units
  const idealX = carGroup.position.x - Math.cos(heading) * 8;
  const idealZ = carGroup.position.z - Math.sin(heading) * 8;
  const idealY = carGroup.position.y + idealHeight;

  const lerpFactor = 0.08;
  camera.position.x += (idealX - camera.position.x) * lerpFactor;
  camera.position.y += (idealY - camera.position.y) * heightLerp;
  camera.position.z += (idealZ - camera.position.z) * lerpFactor;

  // Camera shake scales with intensity (none at 0, full at 1)
  if (boostIntensity > 0.05) {
    shakePhase += dt * 15;
    camera.position.x += Math.sin(shakePhase) * 0.04 * boostIntensity;
    camera.position.y += Math.cos(shakePhase * 0.7) * 0.03 * boostIntensity;
  } else {
    shakePhase *= 0.9;
  }

  // Look-ahead scales with intensity
  const lookAheadDist = 3 * boostIntensity;
  const lookX = carGroup.position.x + Math.cos(heading) * lookAheadDist;
  const lookZ = carGroup.position.z + Math.sin(heading) * lookAheadDist;
  camera.lookAt(lookX, carGroup.position.y + 1, lookZ);

  // FOV ramps with intensity (50 → BOOST_FOV)
  const targetFov = 50 + (CONFIG.BOOST_FOV - 50) * boostIntensity;
  camera.fov += (targetFov - camera.fov) * 0.1;
  camera.updateProjectionMatrix();
}
