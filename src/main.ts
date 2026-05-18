import './styles/main.css';
import { initTheme } from './theme';
import { initLang, translatePage } from './i18n';
import { createHeader } from './components/header';
import { createOverlay } from './components/overlay';
import { createDrivingUI } from './components/driving-ui';
import { initScene, type SceneAPI } from './scene/scene-manager';
import { createFallbackView } from './fallback/css-panels';
import { preloadGameAssets } from './game/preload';

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  initTheme();
  initLang();

  const app = document.getElementById('app');
  if (!app) throw new Error('Missing #app element');

  // Header (floating above everything)
  document.body.prepend(createHeader());

  // Scene wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'scene-wrapper';
  app.appendChild(wrapper);

  // Overlay (appended to body, above everything)
  document.body.appendChild(createOverlay());

  let sceneApi: SceneAPI | null = null;

  if (hasWebGL()) {
    try {
      sceneApi = await initScene(wrapper);
    } catch (e) {
      console.warn('Three.js scene failed to initialize, falling back to CSS:', e);
      wrapper.appendChild(createFallbackView());
    }
  } else {
    wrapper.appendChild(createFallbackView());
  }

  // Preload game assets in background (WASM, terrain, car, sky, audio)
  const assetsPromise = preloadGameAssets().catch((e) => {
    console.warn('Game asset preloading failed:', e);
    return null;
  });

  // Driving UI — HUD only (enter button is now a 3D mesh in the scene)
  const drivingUI = createDrivingUI();
  drivingUI.onExitClick(() => {
    sceneApi?.exitDriving();
  });

  // Pass refs to scene so the 3D enter button can trigger driving mode
  if (sceneApi) {
    sceneApi.setDrivingRefs(assetsPromise, drivingUI);
  }

  // Wire theme changes to scene
  document.addEventListener('theme-changed', ((e: CustomEvent) => {
    sceneApi?.onThemeChange(e.detail as 'light' | 'dark');
  }) as EventListener);

  // Wire language changes to scene
  document.addEventListener('lang-changed', () => {
    sceneApi?.onLangChange();
  });

  translatePage();
}

document.addEventListener('DOMContentLoaded', main);
