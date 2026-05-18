import * as THREE from 'three';
import type { CarObject } from '../types';

function deg(d: number): number {
  return d * Math.PI / 180;
}

export function createCar(color?: number): CarObject {
  const group = new THREE.Group();
  group.name = 'car';

  // Body color
  const bodyColor = color !== undefined
    ? new THREE.Color(color)
    : new THREE.Color().setHSL(Math.random(), 0.7, 0.55);

  const bodyMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const glassMat = new THREE.MeshLambertMaterial({
    color: 0x223344,
    transparent: true,
    opacity: 0.4,
  });

  // Chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.35, 1.4), bodyMaterial);
  chassis.position.set(0, 0.55, 0);
  group.add(chassis);

  // Skirt
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.15, 1.3), darkMat);
  skirt.position.set(0, 0.32, 0);
  group.add(skirt);

  // Hood
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 1.3), bodyMaterial);
  hood.position.set(1.0, 0.85, 0);
  group.add(hood);

  // Cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 1.2), bodyMaterial);
  cabin.position.set(-0.15, 1.05, 0);
  group.add(cabin);

  // Windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 1.15), glassMat);
  windshield.position.set(0.65, 0.98, 0);
  windshield.rotation.z = deg(-25);
  group.add(windshield);

  // Rear glass
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 1.15), glassMat);
  rearGlass.position.set(-0.9, 1.05, 0);
  rearGlass.rotation.z = deg(30);
  group.add(rearGlass);

  // Side windows
  for (const zSign of [1, -1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 0.04), glassMat);
    side.position.set(-0.15, 1.1, 0.6 * zSign);
    group.add(side);
  }

  // Trunk
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 1.3), bodyMaterial);
  trunk.position.set(-1.1, 0.875, 0);
  group.add(trunk);

  // Spoiler
  for (const zSign of [1, -1]) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), darkMat);
    stand.position.set(-1.35, 1.1, 0.45 * zSign);
    group.add(stand);
  }
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 1.3), darkMat);
  wing.position.set(-1.4, 1.2, 0);
  group.add(wing);

  // Headlights
  const hlMat = new THREE.MeshLambertMaterial({
    color: 0xfff8b0, emissive: 0xfff8b0, emissiveIntensity: 0.8,
  });
  for (const zSign of [1, -1]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), hlMat);
    hl.position.set(1.55, 0.75, 0.45 * zSign);
    hl.scale.set(1, 1, 0.5);
    group.add(hl);
  }

  // Taillights
  const tlMat = new THREE.MeshLambertMaterial({
    color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 0.6,
  });
  for (const zSign of [1, -1]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.35), tlMat);
    tl.position.set(-1.55, 0.6, 0.4 * zSign);
    group.add(tl);
  }

  // Wheels — hierarchy: pivot (position) -> wheelGroup (steering Y) -> [tire, rim] (spin X)
  // Spin goes on the inner wheelGroup so it doesn't conflict with steering on the pivot
  const wheelPositions: [number, number, number][] = [
    [1.0, 0.35, 0.7],   // FL
    [1.0, 0.35, -0.7],  // FR
    [-1.0, 0.35, 0.7],  // RL
    [-1.0, 0.35, -0.7], // RR
  ];

  // Tire texture — alternating dark/light bands for visible spin
  const tireCanvas = document.createElement('canvas');
  tireCanvas.width = 64;
  tireCanvas.height = 64;
  const tireCtx = tireCanvas.getContext('2d')!;
  // Dark rubber base
  tireCtx.fillStyle = '#1a1a1a';
  tireCtx.fillRect(0, 0, 64, 64);
  // Tread lines (lighter bands)
  tireCtx.fillStyle = '#333333';
  for (let i = 0; i < 8; i++) {
    tireCtx.fillRect(0, i * 16, 64, 6);
  }
  const tireTex = new THREE.CanvasTexture(tireCanvas);
  tireTex.wrapS = THREE.RepeatWrapping;
  tireTex.wrapT = THREE.RepeatWrapping;
  tireTex.repeat.set(1, 3);

  const tireMat = new THREE.MeshLambertMaterial({ map: tireTex });
  const rimMat = new THREE.MeshLambertMaterial({ color: 0x999999 });

  const wheels: THREE.Group[] = [];
  const frontWheels: THREE.Group[] = [];

  for (let i = 0; i < wheelPositions.length; i++) {
    const [wx, wy, wz] = wheelPositions[i];

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.28, 10), tireMat);
    tire.rotation.x = Math.PI / 2;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 6), rimMat);
    rim.rotation.x = Math.PI / 2;

    // wheelGroup holds tire+rim — spin is applied here (rotation.z)
    const wheelGroup = new THREE.Group();
    wheelGroup.add(tire);
    wheelGroup.add(rim);

    // pivot is positioned — steering applied here (rotation.y) for front wheels only
    const pivot = new THREE.Group();
    pivot.position.set(wx, wy, wz);
    pivot.add(wheelGroup);

    group.add(pivot);

    // Store the pivot for steering, wheelGroup for spin
    // We store pivots in wheels[] — physics will access pivot.children[0] for spin
    wheels.push(pivot);
    if (i < 2) frontWheels.push(pivot);
  }

  return { group, wheels, frontWheels, bodyMaterial };
}
