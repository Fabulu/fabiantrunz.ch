import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { getMode, setMode, onModeChange } from '../../game-state.js';
import { scatterPanels, tickScatter } from '../panel-scatter.js';
import type { PanelData } from '../../../scene/panels.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset game-state module between tests (mode defaults to 'gallery'). */
function resetGameState() {
  // Drive it back to 'gallery' so each test starts fresh.
  // setMode is a no-op if already 'gallery', so force through another state.
  setMode('driving');
  setMode('gallery');
}

/** Create a minimal PanelData mock suitable for scatter tests. */
function makeMockPanel(x = 1, y = 0, z = 1): PanelData {
  const mesh = new THREE.Group();
  mesh.position.set(x, y, z);

  return {
    mesh,
    frontMesh: new THREE.Mesh(),
    project: {} as any,
    basePosition: new THREE.Vector3(x, y, z),
    baseRotation: new THREE.Euler(0, 0, 0),
    baseScale: 1,
    texture: {} as any,
    material: {} as any,
  };
}

// ---------------------------------------------------------------------------
// game-state.ts
// ---------------------------------------------------------------------------

describe('game-state', () => {
  beforeEach(() => {
    resetGameState();
  });

  it('1. initial mode is "gallery"', () => {
    assert.equal(getMode(), 'gallery');
  });

  it('2. setMode changes mode', () => {
    setMode('driving');
    assert.equal(getMode(), 'driving');
  });

  it('3. setMode with same value does not fire callback', () => {
    let callCount = 0;
    const unsub = onModeChange(() => { callCount++; });

    setMode('gallery'); // same as current
    assert.equal(callCount, 0);

    unsub();
  });

  it('4. onModeChange callback fires on change', () => {
    const received: string[] = [];
    const unsub = onModeChange((mode) => { received.push(mode); });

    setMode('transitioning');
    setMode('driving');

    assert.deepEqual(received, ['transitioning', 'driving']);

    unsub();
  });

  it('5. unsubscribe stops callback', () => {
    let callCount = 0;
    const unsub = onModeChange(() => { callCount++; });

    setMode('driving');
    assert.equal(callCount, 1);

    unsub();

    setMode('transitioning');
    assert.equal(callCount, 1); // no additional call
  });
});

// ---------------------------------------------------------------------------
// panel-scatter.ts
// ---------------------------------------------------------------------------

describe('panel-scatter', () => {
  it('6. scatterPanels returns array of length matching input', () => {
    const panels = [makeMockPanel(1, 0, 1), makeMockPanel(-2, 0, 3), makeMockPanel(0, 0, -1)];
    const state = scatterPanels(panels);
    assert.equal(state.length, panels.length);
  });

  it('7. all items start with active=true', () => {
    const panels = [makeMockPanel(), makeMockPanel(2, 0, 2)];
    const state = scatterPanels(panels);
    for (const item of state) {
      assert.equal(item.active, true);
    }
  });

  it('8. tickScatter with dt=0 is a no-op', () => {
    const panels = [makeMockPanel(1, 0, 1)];
    const state = scatterPanels(panels);

    // Snapshot positions before tick
    const posBefore = state[0].panel.mesh.position.clone();
    const velBefore = state[0].velocity.clone();

    tickScatter(state, 0);

    assert.deepEqual(state[0].panel.mesh.position, posBefore);
    assert.deepEqual(state[0].velocity, velBefore);
  });
});

// ---------------------------------------------------------------------------
// box-walls.ts -- SKIPPED
// ---------------------------------------------------------------------------

describe('box-walls', () => {
  it.skip('requires THREE Scene/Geometry which is not available in a headless Node environment', () => {
    // box-walls.ts depends on THREE.Scene, THREE.BoxGeometry, and possibly
    // WebGL renderer internals. These cannot be meaningfully instantiated in
    // a plain Node.js process without a full jsdom + WebGL stub, so these
    // tests are intentionally skipped.
  });
});
