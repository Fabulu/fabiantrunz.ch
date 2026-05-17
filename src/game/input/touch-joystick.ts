import type { InputState } from '../types';

export function createTouchJoystick(): {
  getState(): InputState;
  mount(): void;
  unmount(): void;
  dispose(): void;
} {
  const DEAD_ZONE = 0.2;
  const MAX_RADIUS = 50; // half of 100px working radius

  let dx = 0;
  let dy = 0;
  let boost = false;
  let jump = false;

  // --- DOM elements ---

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.zIndex = '1000';
  container.style.pointerEvents = 'none';

  // Joystick base
  const base = document.createElement('div');
  base.style.position = 'fixed';
  base.style.bottom = '20px';
  base.style.left = '20px';
  base.style.width = '120px';
  base.style.height = '120px';
  base.style.background = 'rgba(0,0,0,0.3)';
  base.style.border = '2px solid rgba(255,255,255,0.3)';
  base.style.borderRadius = '50%';
  base.style.pointerEvents = 'auto';
  base.style.touchAction = 'none';
  base.style.display = 'flex';
  base.style.alignItems = 'center';
  base.style.justifyContent = 'center';

  // Joystick knob
  const knob = document.createElement('div');
  knob.style.width = '40px';
  knob.style.height = '40px';
  knob.style.background = 'rgba(255,255,255,0.5)';
  knob.style.borderRadius = '50%';
  knob.style.pointerEvents = 'none';
  knob.style.transition = 'none';
  knob.style.transform = 'translate(0px, 0px)';

  base.appendChild(knob);

  // Boost button
  const boostBtn = document.createElement('div');
  boostBtn.textContent = 'BOOST';
  boostBtn.style.position = 'fixed';
  boostBtn.style.bottom = '100px';
  boostBtn.style.right = '20px';
  boostBtn.style.width = '60px';
  boostBtn.style.height = '60px';
  boostBtn.style.background = 'rgba(245,158,11,0.4)';
  boostBtn.style.border = '2px solid rgba(245,158,11,0.6)';
  boostBtn.style.borderRadius = '50%';
  boostBtn.style.color = 'white';
  boostBtn.style.fontSize = '11px';
  boostBtn.style.fontWeight = 'bold';
  boostBtn.style.display = 'flex';
  boostBtn.style.alignItems = 'center';
  boostBtn.style.justifyContent = 'center';
  boostBtn.style.pointerEvents = 'auto';
  boostBtn.style.touchAction = 'none';
  boostBtn.style.userSelect = 'none';

  // Jump button
  const jumpBtn = document.createElement('div');
  jumpBtn.textContent = 'JUMP';
  jumpBtn.style.position = 'fixed';
  jumpBtn.style.bottom = '20px';
  jumpBtn.style.right = '20px';
  jumpBtn.style.width = '60px';
  jumpBtn.style.height = '60px';
  jumpBtn.style.background = 'rgba(59,130,246,0.4)';
  jumpBtn.style.border = '2px solid rgba(59,130,246,0.6)';
  jumpBtn.style.borderRadius = '50%';
  jumpBtn.style.color = 'white';
  jumpBtn.style.fontSize = '11px';
  jumpBtn.style.fontWeight = 'bold';
  jumpBtn.style.display = 'flex';
  jumpBtn.style.alignItems = 'center';
  jumpBtn.style.justifyContent = 'center';
  jumpBtn.style.pointerEvents = 'auto';
  jumpBtn.style.touchAction = 'none';
  jumpBtn.style.userSelect = 'none';

  container.appendChild(base);
  container.appendChild(boostBtn);
  container.appendChild(jumpBtn);

  // --- Joystick pointer handling ---

  let centerX = 0;
  let centerY = 0;

  function onBasePointerDown(e: PointerEvent): void {
    base.setPointerCapture(e.pointerId);
    const rect = base.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
  }

  function onBasePointerMove(e: PointerEvent): void {
    if (!base.hasPointerCapture(e.pointerId)) return;

    let rawDx = e.clientX - centerX;
    let rawDy = e.clientY - centerY;
    const mag = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

    if (mag > MAX_RADIUS) {
      rawDx = (rawDx / mag) * MAX_RADIUS;
      rawDy = (rawDy / mag) * MAX_RADIUS;
    }

    dx = rawDx / MAX_RADIUS; // normalized to [-1, 1]
    dy = rawDy / MAX_RADIUS;
    knob.style.transform = `translate(${rawDx}px, ${rawDy}px)`;
  }

  function onBasePointerUp(e: PointerEvent): void {
    if (base.hasPointerCapture(e.pointerId)) {
      base.releasePointerCapture(e.pointerId);
    }
    dx = 0;
    dy = 0;
    knob.style.transform = 'translate(0px, 0px)';
  }

  // --- Button handlers ---

  function onBoostDown(e: PointerEvent): void {
    boostBtn.setPointerCapture(e.pointerId);
    boost = true;
  }

  function onBoostUp(): void {
    boost = false;
  }

  function onJumpDown(e: PointerEvent): void {
    jumpBtn.setPointerCapture(e.pointerId);
    jump = true;
  }

  function onJumpUp(): void {
    jump = false;
  }

  // --- Lifecycle ---

  let mounted = false;

  function mount(): void {
    if (mounted) return;
    if (!('ontouchstart' in window)) return;

    document.body.appendChild(container);
    mounted = true;

    base.addEventListener('pointerdown', onBasePointerDown);
    base.addEventListener('pointermove', onBasePointerMove);
    base.addEventListener('pointerup', onBasePointerUp);
    base.addEventListener('pointercancel', onBasePointerUp);

    boostBtn.addEventListener('pointerdown', onBoostDown);
    boostBtn.addEventListener('pointerup', onBoostUp);
    boostBtn.addEventListener('pointercancel', onBoostUp);

    jumpBtn.addEventListener('pointerdown', onJumpDown);
    jumpBtn.addEventListener('pointerup', onJumpUp);
    jumpBtn.addEventListener('pointercancel', onJumpUp);
  }

  function unmount(): void {
    if (!mounted) return;

    base.removeEventListener('pointerdown', onBasePointerDown);
    base.removeEventListener('pointermove', onBasePointerMove);
    base.removeEventListener('pointerup', onBasePointerUp);
    base.removeEventListener('pointercancel', onBasePointerUp);

    boostBtn.removeEventListener('pointerdown', onBoostDown);
    boostBtn.removeEventListener('pointerup', onBoostUp);
    boostBtn.removeEventListener('pointercancel', onBoostUp);

    jumpBtn.removeEventListener('pointerdown', onJumpDown);
    jumpBtn.removeEventListener('pointerup', onJumpUp);
    jumpBtn.removeEventListener('pointercancel', onJumpUp);

    container.remove();
    mounted = false;

    dx = 0;
    dy = 0;
    boost = false;
    jump = false;
  }

  function dispose(): void {
    unmount();
  }

  function getState(): InputState {
    return {
      forward: dy < -DEAD_ZONE,
      backward: dy > DEAD_ZONE,
      left: dx < -DEAD_ZONE,
      right: dx > DEAD_ZONE,
      brake: false,
      boost,
      jump,
    };
  }

  return { getState, mount, unmount, dispose };
}
