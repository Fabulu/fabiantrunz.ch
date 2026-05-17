import type { InputState } from '../types';

export function createKeyboardInput(): { getState(): InputState; dispose(): void } {
  const keys = new Set<string>();

  function onKeyDown(e: KeyboardEvent): void {
    keys.add(e.code);
    // Prevent default for game keys to avoid page scroll etc
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e: KeyboardEvent): void {
    keys.delete(e.code);
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  function getState(): InputState {
    return {
      forward: keys.has('KeyW') || keys.has('ArrowUp'),
      backward: keys.has('KeyS') || keys.has('ArrowDown'),
      left: keys.has('KeyA') || keys.has('ArrowLeft'),
      right: keys.has('KeyD') || keys.has('ArrowRight'),
      brake: false,
      boost: keys.has('ShiftLeft') || keys.has('ShiftRight'),
      jump: keys.has('Space'),
    };
  }

  function dispose(): void {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    keys.clear();
  }

  return { getState, dispose };
}
