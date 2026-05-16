import './styles/main.css';
import { initTheme } from './theme';
import { initLang, translatePage } from './i18n';
import { createHeader } from './components/header';
import { createOverlay } from './components/overlay';
import { createUiBar } from './components/ui-bar';
import { initScene, type SceneAPI } from './scene/scene-manager';
import { createFallbackView } from './fallback/css-panels';

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

  // Overlay (sibling of canvas inside wrapper)
  wrapper.appendChild(createOverlay());

  // UI hint bar
  document.body.appendChild(createUiBar());

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
