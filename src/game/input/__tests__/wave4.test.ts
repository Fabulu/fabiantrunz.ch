import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { CONFIG } from '../../types';
import { createCarPhysics } from '../../car/car-physics';
import { getHeightAt } from '../../environment/terrain';
import type { CarObject, InputState } from '../../types';

// Helper: create a minimal mock CarObject for physics testing
function mockCarObject(): CarObject {
  const group = new THREE.Group() as any;
  const wheels = [
    new THREE.Group(),
    new THREE.Group(),
    new THREE.Group(),
    new THREE.Group(),
  ];
  const frontWheels = [wheels[0], wheels[1]];
  const bodyMaterial = new THREE.MeshLambertMaterial();

  return { group, wheels, frontWheels, bodyMaterial };
}

// Helper: create a neutral input state
function noInput(): InputState {
  return { forward: false, backward: false, left: false, right: false, brake: false, boost: false, jump: false };
}

const DT = 1 / 60; // typical frame delta

// ---------------------------------------------------------------------------
// 1. Keyboard input (requires DOM)
// ---------------------------------------------------------------------------
describe('keyboard-input', () => {
  it('Skip: Requires DOM addEventListener', () => {
    // keyboard-input.ts calls document.addEventListener at import time,
    // which is not available in a pure Node.js environment.
    // These tests should be run in a browser-based test runner or with jsdom.
  });
});

// ---------------------------------------------------------------------------
// 2. After reset(), position.y should be ~8 (getHeightAt(0,0))
// ---------------------------------------------------------------------------
describe('car-physics reset height', () => {
  it('after reset(), position.y equals getHeightAt(0,0)', () => {
    const physics = createCarPhysics(mockCarObject());
    physics.reset();
    const state = physics.getState();
    const expectedY = getHeightAt(0, 0);
    assert.ok(
      Math.abs(state.position.y - expectedY) < 0.01,
      `Expected position.y ~${expectedY}, got ${state.position.y}`,
    );
    // Sanity check: getHeightAt(0,0) should be close to 8
    assert.ok(
      Math.abs(expectedY - 8) < 1,
      `Expected getHeightAt(0,0) near 8, got ${expectedY}`,
    );
  });
});

// ---------------------------------------------------------------------------
// 3. With forward=true for 10 ticks, position.y follows terrain
// ---------------------------------------------------------------------------
describe('car-physics terrain following', () => {
  it('with forward=true for 10 ticks, position.y follows terrain (not stuck at 0)', () => {
    const physics = createCarPhysics(mockCarObject());
    physics.reset();
    const input: InputState = { ...noInput(), forward: true };
    for (let i = 0; i < 10; i++) {
      physics.tick(DT, input);
    }
    const state = physics.getState();
    const expectedY = getHeightAt(state.position.x, state.position.z);
    // When not airborne, position.y should match terrain height
    assert.ok(
      Math.abs(state.position.y - expectedY) < 0.1,
      `Expected position.y ~${expectedY}, got ${state.position.y}`,
    );
    // Also confirm it's not just sitting at 0
    assert.ok(
      state.position.y !== 0 || expectedY === 0,
      `position.y should follow terrain, not stay at 0`,
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Jump: car should land back at groundHeight after jumping
// ---------------------------------------------------------------------------
describe('car-physics jump', () => {
  it('after jump, car becomes airborne then lands back at groundHeight', () => {
    const physics = createCarPhysics(mockCarObject());
    physics.reset();

    // First tick: jump=true to initiate jump
    const jumpInput: InputState = { ...noInput(), jump: true };
    physics.tick(DT, jumpInput);
    assert.strictEqual(physics.getState().isAirborne, true, 'car should be airborne after jump');

    // Subsequent ticks: jump=false, let gravity bring car down
    const idle = noInput();
    let landed = false;
    for (let i = 0; i < 300; i++) {
      physics.tick(DT, idle);
      if (!physics.getState().isAirborne) {
        landed = true;
        break;
      }
    }
    assert.ok(landed, 'car should land after jumping');

    const state = physics.getState();
    const groundHeight = getHeightAt(state.position.x, state.position.z);
    assert.ok(
      Math.abs(state.position.y - groundHeight) < 0.1,
      `Expected position.y ~${groundHeight} after landing, got ${state.position.y}`,
    );
  });
});

// ---------------------------------------------------------------------------
// 5. Boost: set boost=true, after 1 tick boostActive should be true
// ---------------------------------------------------------------------------
describe('car-physics boost activation', () => {
  it('after 1 tick with boost=true, boostActive is true in getState()', () => {
    const physics = createCarPhysics(mockCarObject());
    physics.reset();
    const boostInput: InputState = { ...noInput(), boost: true };
    physics.tick(DT, boostInput);
    assert.strictEqual(physics.getState().boostActive, true, 'boostActive should be true after boost input');
  });
});

// ---------------------------------------------------------------------------
// 6. Boost cooldown: after boost expires, boost input doesn't reactivate
// ---------------------------------------------------------------------------
describe('car-physics boost cooldown', () => {
  it('after boost expires, boost input does not reactivate for BOOST_COOLDOWN seconds', () => {
    const physics = createCarPhysics(mockCarObject());
    physics.reset();

    // Activate boost
    const boostInput: InputState = { ...noInput(), boost: true };
    physics.tick(DT, boostInput);
    assert.strictEqual(physics.getState().boostActive, true, 'boost should be active');

    // Tick until boost duration expires (release boost input so we don't re-trigger)
    const idle = noInput();
    const durationTicks = Math.ceil(CONFIG.BOOST_DURATION / DT) + 5;
    for (let i = 0; i < durationTicks; i++) {
      physics.tick(DT, idle);
    }
    assert.strictEqual(physics.getState().boostActive, false, 'boost should have expired');

    // Now try to activate boost again immediately — should fail due to cooldown
    physics.tick(DT, boostInput);
    assert.strictEqual(
      physics.getState().boostActive,
      false,
      'boost should NOT reactivate during cooldown',
    );

    // Tick through most of cooldown but not all
    const halfCooldownTicks = Math.floor((CONFIG.BOOST_COOLDOWN * 0.5) / DT);
    for (let i = 0; i < halfCooldownTicks; i++) {
      physics.tick(DT, idle);
    }
    // Still in cooldown
    physics.tick(DT, boostInput);
    assert.strictEqual(
      physics.getState().boostActive,
      false,
      'boost should NOT reactivate during mid-cooldown',
    );

    // Tick through the rest of cooldown
    const remainingTicks = Math.ceil((CONFIG.BOOST_COOLDOWN * 0.6) / DT) + 5;
    for (let i = 0; i < remainingTicks; i++) {
      physics.tick(DT, idle);
    }

    // Now boost should be reactivatable
    physics.tick(DT, boostInput);
    assert.strictEqual(
      physics.getState().boostActive,
      true,
      'boost should reactivate after cooldown expires',
    );
  });
});
