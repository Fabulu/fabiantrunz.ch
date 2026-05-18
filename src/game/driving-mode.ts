import * as THREE from 'three';
import gsap from 'gsap';
import type { PanelData } from '../scene/panels';
import type { LightingRig } from '../scene/lighting';
import type { PreloadedAssets } from './preload';
import { setMode } from './game-state';
import { createCarPhysics } from './car/car-physics';
import { updateChaseCamera } from './camera/chase-camera';
import { createKeyboardInput } from './input/keyboard-input';
import { createTouchJoystick } from './input/touch-joystick';
import { createFog } from './environment/sky';
import { getHeightAt } from './environment/terrain';
import { createDrivingLighting } from './environment/driving-lighting';
import { createRocks } from './physics/rocks';
import { createCarCollider } from './physics/car-collider';
import { createBuildings } from './buildings/building-factory';
import { createZoneProps } from './buildings/zone-props';
import { createProximitySystem } from './buildings/proximity';
import { createObstacleSystem } from './physics/obstacle-collisions';
import { createBoxWalls, createWallOpenTimeline } from './transition/box-walls';
import { createPanelFloat, tickPanelFloat, resetPanels } from './transition/panel-scatter';
import type { DrivingUI } from '../components/driving-ui';
import type { InputState } from './types';
import { createAudioManager } from './audio/audio-manager';
import { createBoostParticles } from './effects/boost-particles';
import { CONFIG } from './types';

export interface DrivingMode {
  tick(dt: number): void;
  dispose(): void;
}

export async function enterDrivingMode(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  _renderer: THREE.WebGLRenderer,
  panels: PanelData[],
  galleryLightingRig: LightingRig,
  preloadedAssets: PreloadedAssets,
  onExit: () => void,
  ui: DrivingUI,
): Promise<DrivingMode> {
  setMode('transitioning');

  // UI
  ui.onExitClick(onExit);

  const audio = createAudioManager(preloadedAssets.audioBuffers);
  await audio.ensureReady();

  // Prepare driving scene behind walls
  const walls = createBoxWalls(scene);
  const floatState = createPanelFloat(panels);

  // Terrain + sky hidden until walls open
  preloadedAssets.terrain.visible = false;
  scene.add(preloadedAssets.terrain);
  scene.background = preloadedAssets.sky;

  // Driving lighting (added early so car is lit during reveal)
  const drivingLights = createDrivingLighting(scene);

  // Car (start invisible, fades in during transition)
  const car = preloadedAssets.car;
  car.group.position.set(0, getHeightAt(0, 0), 0);
  car.bodyMaterial.transparent = true;
  car.bodyMaterial.opacity = 0;
  scene.add(car.group);

  // Cinematic transition (~5s)
  const carPos = car.group.position;

  await new Promise<void>(resolve => {
    const master = gsap.timeline({ onComplete: resolve });

    // Phase 1 (0-1.5s): Camera pulls back and up, car fades in
    // CRITICAL: camera must stay at Z > 0 (same side as lookAt target)
    // to avoid 180° gimbal spin
    master.to(camera.position, {
      x: carPos.x - 6,
      y: carPos.y + 7,
      z: carPos.z + 2,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(carPos.x, carPos.y + 1, carPos.z),
    }, 0);
    master.to(car.bodyMaterial, { opacity: 1, duration: 1.2 }, 0.3);

    // Phase 2 (1.5-3.8s): Walls hinge open slowly, terrain revealed
    const wallTl = createWallOpenTimeline(walls);
    master.add(wallTl, 1.5);

    // Reveal terrain + fog as walls open
    master.call(() => {
      preloadedAssets.terrain.visible = true;
      scene.fog = createFog();
    }, undefined, 2.0);

    // Remove gallery lighting during wall open
    master.call(() => {
      scene.remove(galleryLightingRig.ambient);
      scene.remove(galleryLightingRig.spot);
      scene.remove(galleryLightingRig.spot.target);
      scene.remove(galleryLightingRig.edgeLightLeft);
      scene.remove(galleryLightingRig.edgeLightRight);
      scene.remove(galleryLightingRig.cursorLight);
    }, undefined, 2.0);

    // Play box-open sound when walls start moving
    master.call(() => audio.playEffect('box-open'), undefined, 1.5);

    // Phase 3 (3.8-5.5s): Camera arcs around to behind car (chase position)
    const behindX = carPos.x - Math.cos(0) * 8;
    const behindZ = carPos.z - Math.sin(0) * 8;
    master.to(camera.position, {
      x: behindX,
      y: carPos.y + 4,
      z: behindZ,
      duration: 1.7,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(carPos.x, carPos.y + 1, carPos.z),
    }, 3.8);

    // Dispose walls after fully open
    master.call(() => walls.dispose(), undefined, 4.0);
  });

  // Restore car material to opaque
  car.bodyMaterial.transparent = false;
  car.bodyMaterial.opacity = 1;

  // Car physics
  const carPhysics = createCarPhysics(car);

  // Boost exhaust particles
  const boostParticles = createBoostParticles(scene);

  // Rapier bodies
  const carCollider = createCarCollider(preloadedAssets.physics);
  const rocks = createRocks(scene, preloadedAssets.physics);

  // Buildings + props
  const buildings = createBuildings(scene);
  const props = createZoneProps(scene);

  // Obstacle collisions (buildings only for now)
  const obstacleSystem = createObstacleSystem([
    { center: { x: 50, z: 0 }, radius: 2.0 },    // Pagoda
    { center: { x: 55, z: 5 }, radius: 2.0 },    // Pavilion
    { center: { x: 35, z: -40 }, radius: 2.5 },   // Observatory
    { center: { x: -35, z: -40 }, radius: 2.5 },  // Lab
    { center: { x: -50, z: 0 }, radius: 2.0 },    // Tower
    { center: { x: 0, z: 50 }, radius: 1.5 },     // Game Table
  ]);

  // Proximity
  const proximity = createProximitySystem(buildings);

  // Input
  const isTouch = 'ontouchstart' in window;
  const keyboard = createKeyboardInput();
  const joystick = createTouchJoystick();
  joystick.mount();

  // Show HUD
  ui.mount();
  document.body.classList.add('driving-mode');
  setMode('driving');
  audio.startEngine();
  audio.playMusic();

  let prevBoostActive = false;
  let prevAirborne = false;
  let rockHitCooldown = 0;

  function tick(dt: number): void {
    // Input
    const input: InputState = isTouch ? joystick.getState() : keyboard.getState();

    // Car physics
    carPhysics.tick(dt, input);
    const state = carPhysics.getState();

    // Obstacle collision resolution
    const resolved = obstacleSystem.resolve(state.position, state.velocity, state.heading);
    if (resolved.correctedX !== state.position.x || resolved.correctedZ !== state.position.z) {
      carPhysics.correctPosition(resolved.correctedX, resolved.correctedZ, resolved.correctedVelocity);
    }

    // Audio
    audio.setEngineSpeed(Math.abs(state.velocity) / CONFIG.MAX_SPEED);
    if (state.boostActive && !prevBoostActive) audio.startBoostLoop();
    if (!state.boostActive && prevBoostActive) audio.stopBoostLoop();
    if (state.isAirborne && !prevAirborne) audio.playEffect('jump');
    if (!state.isAirborne && prevAirborne) audio.playEffect('land');
    prevBoostActive = state.boostActive;
    prevAirborne = state.isAirborne;

    // Boost particles
    boostParticles.tick(dt, car.group, state.heading, state.boostActive);

    // Rapier sync
    carCollider.syncFromPhysics(state.position, state.heading);
    preloadedAssets.physics.step();
    rocks.syncAll();

    // Rock-hit sound (distance-based, with debounce)
    if (rockHitCooldown > 0) {
      rockHitCooldown -= dt;
    } else {
      for (const rockMesh of rocks.meshes) {
        const dx = state.position.x - rockMesh.position.x;
        const dz = state.position.z - rockMesh.position.z;
        if (dx * dx + dz * dz < 4) { // within ~2 units
          audio.playEffect('rock-hit');
          rockHitCooldown = 0.3;
          break;
        }
      }
    }

    // Camera
    updateChaseCamera(camera, car.group, state.heading, dt, state.boostActive);

    // Proximity overlay
    proximity.update(state.position);

    // Panels: bob until car hits them, then scatter
    tickPanelFloat(floatState, dt, state.position);

    // HUD
    ui.update(Math.abs(state.velocity), state.boostActive, state.boostCharge);
  }

  function dispose(): void {
    setMode('transitioning');

    // Reset panels back to gallery
    resetPanels(floatState);

    // Remove driving objects
    scene.remove(preloadedAssets.terrain);
    scene.remove(car.group);
    rocks.dispose(scene);
    for (const b of buildings) scene.remove(b.group);
    scene.remove(props);

    // Driving lights
    drivingLights.dispose();

    // Restore gallery
    scene.fog = null;
    scene.background = new THREE.Color(0x050508);
    scene.add(galleryLightingRig.ambient);
    scene.add(galleryLightingRig.spot);
    scene.add(galleryLightingRig.spot.target);
    scene.add(galleryLightingRig.edgeLightLeft);
    scene.add(galleryLightingRig.edgeLightRight);
    scene.add(galleryLightingRig.cursorLight);

    // Cleanup
    proximity.dispose();
    carCollider.dispose();
    keyboard.dispose();
    joystick.unmount();
    joystick.dispose();
    ui.unmount();

    // Camera reset
    camera.fov = 50;
    camera.updateProjectionMatrix();

    boostParticles.dispose();

    audio.stopBoostLoop();
    audio.stopMusic();
    audio.stopEngine();
    audio.dispose();

    document.body.classList.remove('driving-mode');
    setMode('gallery');
  }

  return { tick, dispose };
}
