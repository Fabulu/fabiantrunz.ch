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

  // Lift panels above terrain height so they don't clip into the hill
  const carY = getHeightAt(0, 0);
  const panelLift = Math.max(0, carY - 0.2 + 0.5); // ensure panels are above terrain
  for (const item of floatState) {
    item.panel.mesh.position.y += panelLift;
  }

  // Car spawns inside the box, among the panels
  const car = preloadedAssets.car;
  car.group.position.set(0, carY, 0);
  car.group.visible = true; // visible from the start — it's in the box with us
  scene.add(car.group);

  // Create walls that SURROUND the camera and panels
  const walls = createBoxWalls(scene);

  // ─── Cinematic transition ────────────────────────────────────────
  // Camera STAYS at gallery position during wall reveal.
  // Walls open around the camera/car/panels to reveal the world.
  // Only AFTER walls are gone does camera move to chase position.

  await new Promise<void>(resolve => {
    const master = gsap.timeline({ onComplete: resolve });

    // Sound effect at start
    master.call(() => audio.playEffect('box-open'), undefined, 0.3);

    // Walls start opening at 0.3s
    const wallTl = createWallOpenTimeline(walls);
    master.add(wallTl, 0.3);

    // At 0.8s: add sky + terrain behind the opening walls
    master.call(() => {
      scene.background = preloadedAssets.sky;
      scene.add(preloadedAssets.terrain);
      scene.fog = createFog();
    }, undefined, 0.8);

    // At 1.2s: swap gallery lighting for driving lighting
    master.call(() => {
      scene.remove(galleryLightingRig.ambient);
      scene.remove(galleryLightingRig.spot);
      scene.remove(galleryLightingRig.spot.target);
      scene.remove(galleryLightingRig.edgeLightLeft);
      scene.remove(galleryLightingRig.edgeLightRight);
      scene.remove(galleryLightingRig.cursorLight);
    }, undefined, 1.2);

    // Camera stays at gallery position during wall open (0-3s)
    // Just a gentle drift upward so you see the world appearing
    master.to(camera.position, {
      x: 0,
      y: 1.5,
      z: 5.0,
      duration: 2.5,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, carY + 0.5, 0),
    }, 0.5);

    // Dispose walls once fully open
    master.call(() => walls.dispose(), undefined, 3.0);

    // Phase 2 (3.0-4.8s): Camera arcs to chase position behind car
    const behindX = -Math.cos(0) * 8; // = -8
    const behindZ = -Math.sin(0) * 8; // = 0
    master.to(camera.position, {
      x: behindX,
      y: carY + 4,
      z: behindZ,
      duration: 1.8,
      ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(0, carY + 1, 0),
    }, 3.0);
  });

  // Driving lighting (added after transition so it doesn't conflict with gallery lights)
  const drivingLights = createDrivingLighting(scene);

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
  let carHasMoved = false; // don't scatter panels until car moves from spawn

  function tick(dt: number): void {
    // Input
    const input: InputState = isTouch ? joystick.getState() : keyboard.getState();

    // Car physics
    carPhysics.tick(dt, input);
    const state = carPhysics.getState();

    // Track if car has moved from spawn (for panel scatter gate)
    if (!carHasMoved) {
      const dx = state.position.x;
      const dz = state.position.z;
      if (dx * dx + dz * dz > 9) carHasMoved = true; // moved 3+ units from origin
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
