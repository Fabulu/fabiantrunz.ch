export type GameMode = 'gallery' | 'transitioning' | 'driving';

type ModeCallback = (mode: GameMode) => void;

let currentMode: GameMode = 'gallery';
const listeners: ModeCallback[] = [];

export function getMode(): GameMode {
  return currentMode;
}

export function setMode(mode: GameMode): void {
  if (mode === currentMode) return;
  currentMode = mode;
  for (const cb of listeners) cb(mode);
}

export function onModeChange(callback: ModeCallback): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
