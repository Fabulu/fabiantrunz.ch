import type { PerspectiveCamera, Group } from 'three';
import { CONFIG } from '../types';

// Persistent shake phase for smooth sine-based camera shake
let shakePhase = 0;

export function updateChaseCamera(
  camera: PerspectiveCamera,
  carGroup: Group,
  heading: number,
  dt: number,
  boostActive: boolean,
): void {
  // Height: lower during boost for a more aggressive feel
  const idealHeight = boostActive ? 3 : 4;
  const heightLerp = boostActive ? 0.12 : 0.08;

  // Ideal position: behind car by 8 units, above by idealHeight
  const idealX = carGroup.position.x - Math.cos(heading) * 8;
  const idealZ = carGroup.position.z - Math.sin(heading) * 8;
  const idealY = carGroup.position.y + idealHeight;

  const lerpFactor = 0.08;
  camera.position.x += (idealX - camera.position.x) * lerpFactor;
  camera.position.y += (idealY - camera.position.y) * heightLerp;
  camera.position.z += (idealZ - camera.position.z) * lerpFactor;

  // Camera shake during boost
  if (boostActive) {
    shakePhase += dt * 15;
    camera.position.x += Math.sin(shakePhase) * 0.04;
    camera.position.y += Math.cos(shakePhase * 0.7) * 0.03;
  } else {
    // Decay shake phase smoothly when not boosting
    shakePhase *= 0.9;
  }

  // Look-ahead: during boost, look slightly ahead of car in heading direction
  const lookAheadDist = boostActive ? 3 : 0;
  const lookX = carGroup.position.x + Math.cos(heading) * lookAheadDist;
  const lookZ = carGroup.position.z + Math.sin(heading) * lookAheadDist;
  camera.lookAt(lookX, carGroup.position.y + 1, lookZ);

  // FOV increase during boost
  const targetFov = boostActive ? CONFIG.BOOST_FOV : 50;
  camera.fov += (targetFov - camera.fov) * 0.1;
  camera.updateProjectionMatrix();
}
