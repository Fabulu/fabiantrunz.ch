import type { PerspectiveCamera, Group } from 'three';
import { CONFIG } from '../types';

export function updateChaseCamera(
  camera: PerspectiveCamera,
  carGroup: Group,
  heading: number,
  _dt: number,
  boostActive: boolean,
): void {
  // Ideal position: behind car by 8 units, above by 4
  const idealX = carGroup.position.x - Math.cos(heading) * 8;
  const idealZ = carGroup.position.z - Math.sin(heading) * 8;
  const idealY = carGroup.position.y + 4;

  const lerpFactor = 0.08;
  camera.position.x += (idealX - camera.position.x) * lerpFactor;
  camera.position.y += (idealY - camera.position.y) * lerpFactor;
  camera.position.z += (idealZ - camera.position.z) * lerpFactor;

  camera.lookAt(carGroup.position.x, carGroup.position.y + 1, carGroup.position.z);

  // FOV increase during boost
  const targetFov = boostActive ? CONFIG.BOOST_FOV : 50;
  camera.fov += (targetFov - camera.fov) * 0.1;
  camera.updateProjectionMatrix();
}
