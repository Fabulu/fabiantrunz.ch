/**
 * Physics module tests.
 *
 * Most of the physics code depends on @dimforge/rapier3d-compat which requires
 * WASM initialisation (RAPIER.init()). This cannot run in a plain Node.js test
 * environment without a WASM loader. Tests that need Rapier are skipped below
 * with an explanation.
 *
 * To run a full integration suite, use a test harness that supports WASM
 * (e.g. vitest with WASM plugin, or a browser-based runner like Playwright).
 */

import { describe, it, skip } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// rocks.ts — mulberry32 seeded PRNG
// ---------------------------------------------------------------------------
// mulberry32 is an internal (non-exported) function inside rocks.ts.
// We duplicate the implementation here so we can unit-test the algorithm in
// isolation. If the function is ever exported, replace this with an import.

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('mulberry32 (seeded PRNG, copied from rocks.ts)', () => {
  it('produces a deterministic sequence for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);

    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());

    assert.deepStrictEqual(seqA, seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);

    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());

    // Extremely unlikely to collide; a single mismatch is sufficient.
    const allEqual = seqA.every((v, i) => v === seqB[i]);
    assert.strictEqual(allEqual, false, 'Different seeds should yield different sequences');
  });

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(999);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      assert.ok(v >= 0 && v < 1, `Value ${v} out of range [0,1)`);
    }
  });
});

// ---------------------------------------------------------------------------
// rocks.ts — createRocks
// ---------------------------------------------------------------------------
describe('createRocks', () => {
  it.skip('requires Rapier WASM init and THREE.js — skipped in unit tests', () => {
    // createRocks depends on:
    //   - @dimforge/rapier3d-compat (WASM)
    //   - three.js scene/mesh/geometry
    //   - PhysicsWorld from rapier-world.ts
    // All of these require either WASM or a GL context.
  });
});

// ---------------------------------------------------------------------------
// car-collider.ts
// ---------------------------------------------------------------------------
describe('car-collider', () => {
  it.skip('requires Rapier WASM init — skipped in unit tests', () => {
    // The car collider module builds Rapier rigid bodies and colliders,
    // which need RAPIER.init() (WASM) before any descriptors can be created.
  });
});

// ---------------------------------------------------------------------------
// rapier-world.ts
// ---------------------------------------------------------------------------
describe('rapier-world', () => {
  it.skip('requires Rapier WASM init — skipped in unit tests', () => {
    // PhysicsWorld wraps RAPIER.World which requires WASM initialisation.
    // Test with vitest + WASM plugin or a browser runner.
  });
});

// ---------------------------------------------------------------------------
// Integration test notes
// ---------------------------------------------------------------------------
describe('integration test guidance', () => {
  it.skip('physics integration tests need a WASM-capable runner', () => {
    // To fully test the physics modules:
    //  1. Use vitest with @aspect-build/vitest-plugin-wasm, or
    //  2. Run tests inside a browser via Playwright/Puppeteer, or
    //  3. Pre-initialise Rapier in a setup file that calls RAPIER.init()
    //     with a manually-loaded .wasm binary.
    //
    // Once WASM works, test:
    //  - createRocks produces the expected number of meshes
    //  - Rock positions avoid the hilltop and lake exclusion zones
    //  - PhysicsWorld.step advances simulation time
    //  - Car collider dimensions match expected values
  });
});
