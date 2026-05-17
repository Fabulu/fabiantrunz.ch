import * as THREE from 'three';
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
import { createBoxWalls, animateBoxOpen } from './transition/box-walls';
import { scatterPanels, tickScatter, resetPanels } from './transition/panel-scatter';
import { createDrivingUI } from '../components/driving-ui';
import type { InputState } from './types';
import { createAudioManager } from './audio/audio-manager';
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
): Promise<DrivingMode> {
  setMode('transitioning');

  // UI
  const ui = createDrivingUI();
  ui.onExitClick(onExit);

  const audio = await createAudioManager();

  // Box transition
  const walls = createBoxWalls(scene);
  const scatterState = scatterPanels(panels);

  await new Promise<void>(resolve => animateBoxOpen(walls, resolve));
  audio.playEffect('box-open');

  // Remove gallery lighting from scene (don't dispose — restored on exit)
  scene.remove(galleryLightingRig.ambient);
  scene.remove(galleryLightingRig.spot);
  scene.remove(galleryLightingRig.spot.target);
  scene.remove(galleryLightingRig.edgeLightLeft);
  scene.remove(galleryLightingRig.edgeLightRight);
  scene.remove(galleryLightingRig.cursorLight);

  // Add terrain
  scene.add(preloadedAssets.terrain);

  // Sky + fog
  scene.background = preloadedAssets.sky;
  scene.fog = createFog();

  // Driving lighting
  const drivingLights = createDrivingLighting(scene);

  // Car
  const car = preloadedAssets.car;
  car.group.position.set(0, getHeightAt(0, 0), 0);
  scene.add(car.group);

  // Car physics
  const carPhysics = createCarPhysics(car);

  // Rapier bodies
  const carCollider = createCarCollider(preloadedAssets.physics);
  const rocks = createRocks(scene, preloadedAssets.physics);

  // Buildings + props
  const buildings = createBuildings(scene);
  const props = createZoneProps(scene);

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

  function tick(dt: number): void {
    // Input
    const input: InputState = isTouch ? joystick.getState() : keyboard.getState();

    // Car physics
    carPhysics.tick(dt, input);
    const state = carPhysics.getState();

    // Audio
    audio.setEngineSpeed(Math.abs(state.velocity) / CONFIG.MAX_SPEED);
    if (state.boostActive && !prevBoostActive) audio.playEffect('boost');
    if (state.isAirborne && !prevAirborne) audio.playEffect('jump');
    if (!state.isAirborne && prevAirborne) audio.playEffect('land');
    prevBoostActive = state.boostActive;
    prevAirborne = state.isAirborne;

    // Rapier sync
    carCollider.syncFromPhysics(state.position, state.heading);
    preloadedAssets.physics.step();
    rocks.syncAll();

    // Camera
    updateChaseCamera(camera, car.group, state.heading, dt, state.boostActive);

    // Proximity overlay
    proximity.update(state.position);

    // Panel scatter (continues until settled)
    tickScatter(scatterState, dt);

    // HUD
    ui.update(Math.abs(state.velocity), state.boostActive, 0);
  }

  function dispose(): void {
    setMode('transitioning');

    // Reset panels back to gallery
    resetPanels(scatterState);

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

    audio.stopMusic();
    audio.stopEngine();
    audio.dispose();

    document.body.classList.remove('driving-mode');
    setMode('gallery');
  }

  return { tick, dispose };
}
