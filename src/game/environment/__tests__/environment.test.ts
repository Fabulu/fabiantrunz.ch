import { describe, it, skip } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getHeightAt } from '../terrain.js';
import { createFog } from '../sky.js';
import { createDrivingLighting, type DrivingLightRig } from '../driving-lighting.js';

// ─── getHeightAt (pure math, no DOM needed) ─────────────────────────────────

describe('getHeightAt', () => {
  it('should be approximately 1.5 at hill peak (0, 0)', () => {
    const h = getHeightAt(0, 0);
    // Hill gaussian peaks at 1.5 (Math.min(1.5, 2*exp(0))), noise ≈ 0 at origin
    assert.ok(
      Math.abs(h - 1.5) <= 1,
      `Expected height near 1.5 (±1), got ${h}`
    );
  });

  it('should be close to 0 far from hill center (100, 0)', () => {
    const h = getHeightAt(100, 0);
    // Gaussian is negligible at distance 100 (exp(-10000/400) ≈ 0)
    // Only noise remains which is bounded ~±1.6
    assert.ok(
      Math.abs(h) < 2,
      `Expected height < 2 far from hill, got ${h}`
    );
  });

  it('should return consistent values for the same input', () => {
    const h1 = getHeightAt(7.5, -3.2);
    const h2 = getHeightAt(7.5, -3.2);
    assert.strictEqual(h1, h2);
  });
});

// ─── createFog (no DOM needed, THREE.Fog is a plain object) ─────────────────

describe('createFog', () => {
  it('returns a THREE.Fog with near=40 and far=120', () => {
    const fog = createFog();
    assert.ok(fog instanceof THREE.Fog);
    assert.strictEqual(fog.near, 40);
    assert.strictEqual(fog.far, 120);
  });

  it('fog color should be a Color object (wheat-ish 0xf5deb3)', () => {
    const fog = createFog();
    assert.ok(fog.color instanceof THREE.Color);
    // Verify the color matches wheat (#f5deb3 = 0xf5deb3)
    const expected = new THREE.Color(0xf5deb3);
    assert.strictEqual(fog.color.getHex(), expected.getHex());
  });
});

// ─── createDrivingLighting (Scene works in Node, no WebGL needed) ────────────

describe('createDrivingLighting', () => {
  it('creates sun, hemisphere, and ambient lights', () => {
    const scene = new THREE.Scene();
    const rig = createDrivingLighting(scene);

    assert.ok(rig.sun instanceof THREE.DirectionalLight);
    assert.ok(rig.hemisphere instanceof THREE.HemisphereLight);
    assert.ok(rig.ambient instanceof THREE.AmbientLight);
  });

  it('dispose removes lights from scene', () => {
    const scene = new THREE.Scene();
    const rig = createDrivingLighting(scene);

    // Scene should have lights added
    const childCountBefore = scene.children.length;
    assert.ok(childCountBefore > 0, 'Expected lights in scene before dispose');

    rig.dispose();

    // After dispose, the lights should be removed
    const hasRigSun = scene.children.includes(rig.sun);
    const hasRigHemi = scene.children.includes(rig.hemisphere);
    const hasRigAmbient = scene.children.includes(rig.ambient);

    assert.strictEqual(hasRigSun, false, 'Sun should be removed from scene');
    assert.strictEqual(hasRigHemi, false, 'Hemisphere should be removed from scene');
    assert.strictEqual(hasRigAmbient, false, 'Ambient should be removed from scene');
  });
});

// ─── Skipped tests (require WebGL/DOM context) ──────────────────────────────

describe('createTerrain (skipped - requires WebGL/DOM)', () => {
  skip('createTerrain needs PlaneGeometry with WebGL context', () => {});
});

describe('createSky (skipped - requires DOM canvas)', () => {
  skip('createSky needs document.createElement("canvas")', () => {});
});
