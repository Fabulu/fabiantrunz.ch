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

  // Panels float (don't scatter yet)
  const floatState = createPanelFloat(panels);

  // Lift panels above floor (Y=0.3) + terrain. Panels have radius 0.6,
  // so Y >= 1.0 puts bottom edge at Y=0.4 (above floor).
  // Save original Y for restore on exit.
  const originalPanelY: number[] = [];
  for (const item of floatState) {
    originalPanelY.push(item.panel.basePosition.y);
    const liftedY = Math.max(item.panel.basePosition.y, 1.0);
    item.panel.mesh.position.y = liftedY;
    item.panel.basePosition.y = liftedY;
  }

  // Car spawns between camera and panels, closer to camera (Z=3)
  // rotation.y = PI/2 → rear faces camera at +Z
  // Chase cam at heading=-PI/2: (car.x, Y, car.z + 8) = (0, Y, 11)
  const carY = getHeightAt(0, 3);
  const car = preloadedAssets.car;
  car.group.position.set(0, Math.max(carY, 0.3), 3);
  car.group.rotation.y = Math.PI / 2;
  car.group.visible = true;
  scene.add(car.group);

  // Box enclosure
  const walls = createBoxWalls(scene);

  // Driving lights early so terrain isn't black
  const drivingLights = createDrivingLighting(scene);

  // ─── Cinematic transition ────────────────────────────────────────
  // Phase 1: Camera pulls BACK (Z increases) to reveal car in front of panels
  // Phase 2: Walls slide away slowly (4-5s)
  // Phase 3: Camera arcs to chase position behind car
  const carPos = car.group.position;

  await new Promise<void>(resolve => {
    const master = gsap.timeline({ onComplete: resolve });

    // Sound
    master.call(() => audio.playEffect('box-open'), undefined, 0.3);

    // Walls fall on hinges (starts at 0.5s)
    const wallTl = createWallOpenTimeline(walls);
    master.add(wallTl, 0.5);

    // Phase 1 (0-3s): Camera pulls BACK to reveal car
    // From gallery (0, 0.3, 4.5) to (0, 3, 11) — chase cam will be at Z=11
    master.to(camera.position, {
      x: 0,
      y: 3,
      z: 11,
      duration: 3.0,
      ease: 'power1.inOut',
      onUpdate: () => camera.lookAt(carPos.x, carPos.y + 0.5, carPos.z),
    }, 0);

    // At 1.5s: sky + terrain appear through widening gaps
    master.call(() => {
      scene.background = preloadedAssets.sky;
      scene.add(preloadedAssets.terrain);
      scene.fog = createFog();
    }, undefined, 1.5);

    // At 2.0s: swap lighting
    master.call(() => {
      scene.remove(galleryLightingRig.ambient);
      scene.remove(galleryLightingRig.spot);
      scene.remove(galleryLightingRig.spot.target);
      scene.remove(galleryLightingRig.edgeLightLeft);
      scene.remove(galleryLightingRig.edgeLightRight);
      scene.remove(galleryLightingRig.cursorLight);
    }, undefined, 2.0);

    // Phase 3 (4.0-5.5s): Camera settles to chase position
    // Car at Z=3, chase cam at Z=3+8=11. Camera already pulled to Z=11.
    // Just adjust Y to chase height.
    master.to(camera.position, {
      x: 0,
      y: carPos.y + 4,
      z: carPos.z + 8,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(carPos.x, carPos.y + 1, carPos.z),
    }, 4.0);
  });

  // Car physics — inits from car.group.position (no teleport)
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
  let carHasMoved = false; // don't scatter panels until car moves from spawn

  function tick(dt: number): void {
    // Input
    const input: InputState = isTouch ? joystick.getState() : keyboard.getState();

    // Car physics
    carPhysics.tick(dt, input);
    const state = carPhysics.getState();

    // Track if car has moved from spawn (for panel scatter gate)
    if (!carHasMoved) {
      const dx = state.position.x - 0;
      const dz = state.position.z - 3; // car starts at Z=3
      if (dx * dx + dz * dz > 9) carHasMoved = true; // moved 3+ units from spawn
    }

    // Obstacle collision resolution
    const resolved = obstacleSystem.resolve(state.position, state.velocity, state.heading);
    if (resolved.correctedX !== state.position.x || resolved.correctedZ !== state.position.z) {
      carPhysics.correctPosition(resolved.correctedX, resolved.correctedZ, resolved.correctedVelocity);
    }

    // Audio
    audio.setEngineSpeed(Math.abs(state.velocity) / CONFIG.MAX_SPEED);
    if (state.boostActive && !prevBoostActive) audio.startBoostLoop();
    if (!state.boostActive && prevBoostActive) audio.stopBoostLoop();
    audio.setBoostIntensity(state.boostIntensity);
    if (state.isAirborne && !prevAirborne) audio.playEffect('jump');
    if (!state.isAirborne && prevAirborne) audio.playEffect('land');
    prevBoostActive = state.boostActive;
    prevAirborne = state.isAirborne;

    // Boost particles
    boostParticles.tick(dt, car.group, state.heading, state.boostActive, state.boostIntensity);

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
    updateChaseCamera(camera, car.group, state.heading, dt, state.boostIntensity);

    // Proximity overlay
    proximity.update(state.position);

    // Panels: bob until car hits them (only scatter after car has moved from spawn)
    if (carHasMoved) {
      tickPanelFloat(floatState, dt, state.position);
    } else {
      // Just bob, no scatter check
      for (const item of floatState) {
        item.bobPhase += dt * 1.2;
        item.panel.mesh.position.y =
          item.panel.basePosition.y + Math.sin(item.bobPhase) * 0.02;
      }
    }

    // HUD
    ui.update(Math.abs(state.velocity), state.boostActive, state.boostCharge);
  }

  function dispose(): void {
    setMode('transitioning');

    // Restore original panel Y positions before reset animation
    for (let i = 0; i < floatState.length; i++) {
      floatState[i].panel.basePosition.y = originalPanelY[i];
    }
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
