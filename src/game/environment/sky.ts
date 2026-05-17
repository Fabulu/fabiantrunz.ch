import * as THREE from 'three';

export function createSky(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 512;

  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0.0, '#1a3a5c');
  gradient.addColorStop(0.5, '#87ceeb');
  gradient.addColorStop(1.0, '#f5deb3');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, 512);

  return new THREE.CanvasTexture(canvas);
}

export function createFog(): THREE.Fog {
  return new THREE.Fog(0xf5deb3, 40, 120);
}
