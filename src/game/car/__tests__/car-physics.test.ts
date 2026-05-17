import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { CONFIG } from '../../types';
import { createCarPhysics } from '../car-physics';
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
// 1. CONFIG values
// ---------------------------------------------------------------------------
describe('CONFIG values', () => {
  it('MAX_SPEED is 20', () => {
    assert.strictEqual(CONFIG.MAX_SPEED, 20);
  });

  it('ACCELERATION is 12', () => {
    assert.strictEqual(CONFIG.ACCELERATION, 12);
  });

  it('BRAKE_FORCE is 20', () => {
    assert.strictEqual(CONFIG.BRAKE_FORCE, 20);
  });

  it('FRICTION is 0.97', () => {
    assert.strictEqual(CONFIG.FRICTION, 0.97);
  });

  it('TURN_RATE is 2.5', () => {
    assert.strictEqual(CONFIG.TURN_RATE, 2.5);
  });

  it('WHEEL_BASE is 2.0', () => {
    assert.strictEqual(CONFIG.WHEEL_BASE, 2.0);
  });
});

// ---------------------------------------------------------------------------
// 2. createCarPhysics returns correct interface
// ---------------------------------------------------------------------------
describe('createCarPhysics', () => {
  it('returns an object with tick, getState, and reset methods', () => {
    const physics = createCarPhysics(mockCarObject());
    assert.strictEqual(typeof physics.tick, 'function');
    assert.strictEqual(typeof physics.getState, 'function');
    assert.strictEqual(typeof physics.reset, 'function');
  });
});

// ---------------------------------------------------------------------------
// 3. Initial state
// ---------------------------------------------------------------------------
describe('Initial state', () => {
  it('velocity is 0', () => {
    const physics = createCarPhysics(mockCarObject());
    assert.strictEqual(physics.getState().velocity, 0);
  });

  it('heading is 0', () => {
    const physics = createCarPhysics(mockCarObject());
    assert.strictEqual(physics.getState().heading, 0);
  });

  it('steeringAngle is 0', () => {
    const physics = createCarPhysics(mockCarObject());
    assert.strictEqual(physics.getState().steeringAngle, 0);
  });

  it('position is (0, 0, 0)', () => {
    const physics = createCarPhysics(mockCarObject());
    const pos = physics.getState().position;
    assert.strictEqual(pos.x, 0);
    assert.strictEqual(pos.y, 0);
    assert.strictEqual(pos.z, 0);
  });
});

// ---------------------------------------------------------------------------
// 4. Forward acceleration
// ---------------------------------------------------------------------------
describe('Forward acceleration', () => {
  it('after ticking with forward=true, velocity > 0', () => {
    const physics = createCarPhysics(mockCarObject());
    const input: InputState = { ...noInput(), forward: true };
    physics.tick(DT, input);
    assert.ok(physics.getState().velocity > 0);
  });
});

// ---------------------------------------------------------------------------
// 5. Max speed cap
// ---------------------------------------------------------------------------
describe('Max speed cap', () => {
  it('velocity does not exceed MAX_SPEED after many forward ticks', () => {
    const physics = createCarPhysics(mockCarObject());
    const input: InputState = { ...noInput(), forward: true };
    for (let i = 0; i < 10000; i++) {
      physics.tick(DT, input);
    }
    assert.ok(physics.getState().velocity <= CONFIG.MAX_SPEED);
  });
});

// ---------------------------------------------------------------------------
// 6. Friction deceleration
// ---------------------------------------------------------------------------
describe('Friction deceleration', () => {
  it('velocity decreases when no input is given after accelerating', () => {
    const physics = createCarPhysics(mockCarObject());
    const fwd: InputState = { ...noInput(), forward: true };
    // Accelerate for a bit
    for (let i = 0; i < 60; i++) {
      physics.tick(DT, fwd);
    }
    const velBefore = physics.getState().velocity;
    // Now tick with no input
    physics.tick(DT, noInput());
    const velAfter = physics.getState().velocity;
    assert.ok(velAfter < velBefore);
  });
});

// ---------------------------------------------------------------------------
// 7. Reverse speed cap
// ---------------------------------------------------------------------------
describe('Reverse speed cap', () => {
  it('velocity does not go below -MAX_SPEED/3', () => {
    const physics = createCarPhysics(mockCarObject());
    const input: InputState = { ...noInput(), backward: true };
    for (let i = 0; i < 10000; i++) {
      physics.tick(DT, input);
    }
    const minSpeed = -CONFIG.MAX_SPEED / 3;
    assert.ok(physics.getState().velocity >= minSpeed);
  });
});

// ---------------------------------------------------------------------------
// 8. Steering
// ---------------------------------------------------------------------------
describe('Steering', () => {
  it('with left=true and velocity>0, heading changes', () => {
    const physics = createCarPhysics(mockCarObject());
    const fwd: InputState = { ...noInput(), forward: true };
    // Build up some velocity
    for (let i = 0; i < 30; i++) {
      physics.tick(DT, fwd);
    }
    const headingBefore = physics.getState().heading;
    const leftInput: InputState = { ...noInput(), forward: true, left: true };
    for (let i = 0; i < 30; i++) {
      physics.tick(DT, leftInput);
    }
    const headingAfter = physics.getState().heading;
    assert.notStrictEqual(headingAfter, headingBefore);
  });
});

// ---------------------------------------------------------------------------
// 9. No steering at zero speed
// ---------------------------------------------------------------------------
describe('No steering at zero speed', () => {
  it('with left=true but velocity=0, heading stays 0', () => {
    const physics = createCarPhysics(mockCarObject());
    const input: InputState = { ...noInput(), left: true };
    physics.tick(DT, input);
    assert.strictEqual(physics.getState().heading, 0);
  });
});

// ---------------------------------------------------------------------------
// 10. Reset
// ---------------------------------------------------------------------------
describe('Reset', () => {
  it('after driving, reset() returns to initial state', () => {
    const physics = createCarPhysics(mockCarObject());
    const fwd: InputState = { ...noInput(), forward: true, left: true };
    for (let i = 0; i < 100; i++) {
      physics.tick(DT, fwd);
    }
    physics.reset();
    const state = physics.getState();
    assert.strictEqual(state.velocity, 0);
    assert.strictEqual(state.heading, 0);
    assert.strictEqual(state.steeringAngle, 0);
    assert.strictEqual(state.position.x, 0);
    assert.strictEqual(state.position.y, 0);
    assert.strictEqual(state.position.z, 0);
  });
});

// ---------------------------------------------------------------------------
// 11. Brake
// ---------------------------------------------------------------------------
describe('Brake', () => {
  it('braking reduces velocity faster than friction alone', () => {
    // Setup two identical physics instances
    const carA = mockCarObject();
    const carB = mockCarObject();
    const physicsA = createCarPhysics(carA);
    const physicsB = createCarPhysics(carB);

    const fwd: InputState = { ...noInput(), forward: true };

    // Accelerate both to the same velocity
    for (let i = 0; i < 120; i++) {
      physicsA.tick(DT, fwd);
      physicsB.tick(DT, fwd);
    }

    // A: coast (friction only), B: brake
    const coast: InputState = noInput();
    const brake: InputState = { ...noInput(), brake: true };

    physicsA.tick(DT, coast);
    physicsB.tick(DT, brake);

    // Braking should reduce velocity more than friction alone
    assert.ok(physicsB.getState().velocity < physicsA.getState().velocity);
  });
});

// ---------------------------------------------------------------------------
// Car model test (skipped - requires DOM/WebGL context)
// ---------------------------------------------------------------------------
describe('createCar (car-model)', () => {
  // NOTE: Three.js mesh/geometry creation uses WebGL internals that may fail
  // in a pure Node.js environment without a DOM or headless GL context.
  // If this test fails due to missing DOM/WebGL, it should be run in a
  // browser-based test runner or with a jsdom/gl polyfill.
  it('returns an object with wheels (length 4) and frontWheels (length 2)', async () => {
    try {
      const { createCar } = await import('../car-model');
      const car = createCar(0xff0000);
      assert.ok(car.wheels, 'should have wheels property');
      assert.strictEqual(car.wheels.length, 4);
      assert.ok(car.frontWheels, 'should have frontWheels property');
      assert.strictEqual(car.frontWheels.length, 2);
    } catch (err: any) {
      // Skip if environment doesn't support Three.js mesh creation
      if (err.message?.includes('document') || err.message?.includes('canvas') || err.message?.includes('WebGL')) {
        console.log('Skipped createCar test: requires DOM/WebGL context');
        return;
      }
      throw err;
    }
  });
});
