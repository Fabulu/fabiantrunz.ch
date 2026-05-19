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
  _galleryLightingRig: LightingRig,
  preloadedAssets: PreloadedAssets,
  onExit: () => void,
  ui: DrivingUI,
): Promise<DrivingMode> {
  setMode('transitioning');

  // Don't change background — walls match the current theme background

  // UI
  ui.onExitClick(onExit);

  const audio = createAudioManager(preloadedAssets.audioBuffers);
  await audio.ensureReady();

  // Panels float (don't scatter yet)
  const floatState = createPanelFloat(panels);

  // Panels stay exactly where they are in gallery — no lifting, no position changes
  const originalPanelY: number[] = floatState.map(item => item.panel.basePosition.y);

  // Car spawns BEHIND the camera (Z=8). Camera at Z=4.5 can't see it yet.
  // rotation.y = PI/2 → rear faces +Z. heading = -PI/2 → car faces -Z.
  // Chase cam at heading=-PI/2: (car.x, Y, car.z + 8) = (0, Y, 16)
  const car = preloadedAssets.car;
  car.group.position.set(0, 0, 8);
  car.group.rotation.y = Math.PI / 2;
  car.group.visible = true;
  scene.add(car.group);

  // Box walls match current theme background (dark=0x050508, light=0xf5f5f8)
  const isDark = document.documentElement.dataset.theme !== 'light';
  const wallColor = isDark ? 0x050508 : 0xf5f5f8; // match scene background exactly
  const walls = createBoxWalls(scene, wallColor);

  // Driving lights early
  const drivingLights = createDrivingLighting(scene);

  // Create world objects BEFORE transition so they appear with terrain (no pop-in)
  const boostParticles = createBoostParticles(scene);
  const carCollider = createCarCollider(preloadedAssets.physics);
  const rocks = createRocks(scene, preloadedAssets.physics);
  const buildings = createBuildings(scene);
  const props = createZoneProps(scene);
  const obstacleSystem = createObstacleSystem([
    { center: { x: 50, z: 0 }, radius: 2.0 },
    { center: { x: 55, z: 5 }, radius: 2.0 },
    { center: { x: 35, z: -40 }, radius: 2.5 },
    { center: { x: -35, z: -40 }, radius: 2.5 },
    { center: { x: -50, z: 0 }, radius: 2.0 },
    { center: { x: 0, z: 50 }, radius: 1.5 },
  ]);
  const proximity = createProximitySystem(buildings);

  // ─── Cinematic transition ────────────────────────────────────────
  // Camera starts at gallery (0, 0.3, 4.5) looking at (0, 0, 0).
  // Pulls straight back along Z, past the car at Z=8, to chase pos at Z=16.
  // No arc needed — pure Z pullback. No lookAt axis crossing.

  // Smooth lookAt interpolation (gallery target → car target)
  // Start lookAt from where the gallery camera was looking (camHeight, 0)
  // Gallery lookAt is (0, camPos[1], 0) — but we don't have camPos here.
  // Use camera.position.y as the lookAt Y (gallery looks straight ahead at same height)
  const lookTarget = new THREE.Vector3(0, camera.position.y, 0);

  await new Promise<void>(resolve => {
    const master = gsap.timeline({ onComplete: resolve });

    // Sound
    master.call(() => audio.playEffect('box-open'), undefined, 0.5);

    // Walls fall on hinges (starts at 1s — after camera has started pulling back)
    const wallTl = createWallOpenTimeline(walls);
    master.add(wallTl, 1.0);

    // Smooth lookAt: (0,0,0) → (0, 1, 8) over first 3s
    master.to(lookTarget, {
      y: 1,
      z: 8,
      duration: 3.0,
      ease: 'power1.inOut',
    }, 0);

    // Camera pulls back: (0, 0.3, 4.5) → (0, 4, 16)
    // This is a straight line along Z — camera passes the car at Z=8
    // and settles at the chase position Z=16
    master.to(camera.position, {
      x: 0,
      y: 4,
      z: 16,
      duration: 5.0,
      ease: 'power1.inOut',
      onUpdate: () => camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z),
    }, 0);

    // At 2s: sky + terrain appear
    master.call(() => {
      scene.background = preloadedAssets.sky;
      scene.add(preloadedAssets.terrain);
      scene.fog = createFog();
    }, undefined, 2.0);

    // Keep gallery lighting throughout — no removal, no fade
  });

  // Car physics — inits from car.group.position (no teleport)
  const carPhysics = createCarPhysics(car);

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
      const dz = state.position.z - 8; // car starts at Z=8
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

    // Remove walls if still present
    walls.dispose();

    // Remove driving objects
    scene.remove(preloadedAssets.terrain);
    scene.remove(car.group);
    rocks.dispose(scene);
    for (const b of buildings) scene.remove(b.group);
    scene.remove(props);

    // Driving lights
    drivingLights.dispose();

    // Restore gallery (lighting stays in scene — never removed)
    scene.fog = null;
    scene.background = new THREE.Color(0x050508);

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
