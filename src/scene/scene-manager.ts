import * as THREE from 'three';
import gsap from 'gsap';
import { createLighting, transitionLighting } from './lighting';
import { createPanels, transitionPanelMaterials, updatePanelTextures } from './panels';
import type { PanelData } from './panels';
import { setupInteraction } from './interaction';
import { getCurrentTheme } from '../theme';
import { getMode } from '../game/game-state';
import { enterDrivingMode } from '../game/driving-mode';
import type { DrivingMode } from '../game/driving-mode';
import type { PreloadedAssets } from '../game/preload';
import type { DrivingUI } from '../components/driving-ui';
import { t } from '../i18n';

// Responsive layout positions
// All cards EXCEPT about lifted +1.5. Camera lifted +1.5 to match.
// About card at ORIGINAL position. Visual result: everything looks
// identical to the original, but in 3D mode all cards are above ground.
const DESKTOP_POSITIONS: [number, number, number][] = [
  [-3.0, 1.7, 0.2], [-1.8, 1.75, 0.072], [-0.6, 1.72, 0.008],
  [0.6, 1.77, 0.008], [1.8, 1.71, 0.072], [3.0, 1.74, 0.2],
  [0, -0.85, 0.1], // about: ORIGINAL, untouched
];

const PORTRAIT_POSITIONS: [number, number, number][] = [
  [-0.8, 3.3, 0], [0.8, 3.3, 0],
  [-0.8, 2.05, 0], [0.8, 2.05, 0],
  [-0.8, 0.8, 0], [0.8, 0.8, 0],
  [0, -1.8, 0], // about: ORIGINAL, untouched
];

// Landscape mobile positions: two rows (about is last = index 6)
const LANDSCAPE_POSITIONS: [number, number, number][] = [
  [-1.8, 2.05, 0], [-0.6, 2.05, 0], [0.6, 2.05, 0], [1.8, 2.05, 0],
  [-1.2, 0.95, 0], [0, 0.95, 0], [1.2, -0.55, 0], // last is about: ORIGINAL
];

function getLayoutMode(w: number, h: number): 'desktop' | 'portrait' | 'landscape-mobile' {
  const aspect = w / h;
  if (w < 900 && aspect < 0.9) return 'portrait';
  if (h < 500) return 'landscape-mobile';
  return 'desktop';
}

function applyLayout(
  panels: PanelData[],
  camera: THREE.PerspectiveCamera,
  cameraBase: THREE.Vector3,
  w: number,
  h: number,
  animate: boolean,
) {
  const mode = getLayoutMode(w, h);
  const dur = animate ? 0.6 : 0;

  let positions: [number, number, number][];
  let fov: number;
  let camPos: [number, number, number];
  let panelScale: number;
  let aboutScale: number;

  if (mode === 'portrait') {
    positions = PORTRAIT_POSITIONS;
    fov = 70;
    camPos = [0, 1.5, 5.0]; // original 0 + 1.5
    panelScale = 0.65;
    aboutScale = 0.6;
  } else if (mode === 'landscape-mobile') {
    positions = LANDSCAPE_POSITIONS;
    fov = 50;
    camPos = [0, 1.5, 3.5]; // original 0 + 1.5
    panelScale = 0.7;
    aboutScale = 0.65;
  } else {
    positions = DESKTOP_POSITIONS;
    fov = 50;
    camPos = [0, 1.8, 4.5]; // original 0.3 + 1.5
    panelScale = 1.0;
    aboutScale = 0.85;
  }

  camera.fov = fov;
  cameraBase.set(camPos[0], camPos[1], camPos[2]);
  camera.position.copy(cameraBase);
  camera.lookAt(0, camPos[1], 0); // look straight ahead from camera height
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  panels.forEach((panel, i) => {
    const pos = positions[i] ?? positions[positions.length - 1];
    const scale = i === panels.length - 1 ? aboutScale : panelScale;
    const rotY = mode === 'desktop' && i < 6 ? Math.atan2(pos[0], 6.0) * 0.4 : 0;

    panel.basePosition.set(pos[0], pos[1], pos[2]);
    panel.baseRotation.set(0, rotY, 0);
    panel.baseScale = scale;

    if (dur > 0) {
      gsap.to(panel.mesh.position, { x: pos[0], y: pos[1], z: pos[2], duration: dur });
      gsap.to(panel.mesh.rotation, { y: rotY, duration: dur });
      gsap.to(panel.mesh.scale, { x: scale, y: scale, z: scale, duration: dur });
    } else {
      panel.mesh.position.set(pos[0], pos[1], pos[2]);
      panel.mesh.rotation.set(0, rotY, 0);
      panel.mesh.scale.setScalar(scale);
    }
  });
}

// ── 3D Enter Button ─────────────────────────────────────────────────
function createButtonTexture(theme: 'light' | 'dark'): THREE.CanvasTexture {
  const W = 512, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Rounded rect background — theme-aware
  const r = 24;
  ctx.beginPath();
  ctx.roundRect(8, 8, W - 16, H - 16, r);
  if (theme === 'dark') {
    ctx.fillStyle = 'rgba(40, 45, 70, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 140, 220, 0.5)';
  } else {
    ctx.fillStyle = 'rgba(230, 235, 245, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 80, 140, 0.4)';
  }
  ctx.lineWidth = 2;
  ctx.stroke();

  // Text
  ctx.fillStyle = theme === 'dark' ? '#c0d0f0' : '#2a3a6a';
  ctx.font = 'bold 42px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t('hero.3d_button'), W / 2, H / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function create3DButton(scene: THREE.Scene, theme: 'light' | 'dark'): {
  mesh: THREE.Mesh;
  texture: THREE.CanvasTexture;
  updateTexture(theme: 'light' | 'dark'): void;
  setVisible(v: boolean): void;
} {
  const texture = createButtonTexture(theme);
  const geo = new THREE.PlaneGeometry(1.2, 0.3);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    toneMapped: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(1.8, 0.2, 0.5); // original -1.3 + 1.5 camera lift
  scene.add(mesh);

  return {
    mesh,
    texture,
    updateTexture(newTheme: 'light' | 'dark') {
      texture.dispose();
      const newTex = createButtonTexture(newTheme);
      mat.map = newTex;
      mat.needsUpdate = true;
      this.texture = newTex;
    },
    setVisible(v: boolean) {
      mesh.visible = v;
    },
  };
}

export interface SceneAPI {
  onThemeChange(theme: 'light' | 'dark'): void;
  onLangChange(): void;
  setDrivingRefs(assets: Promise<PreloadedAssets | null>, ui: DrivingUI): void;
  enterDriving(assets: PreloadedAssets, ui: DrivingUI): Promise<void>;
  exitDriving(): void;
  dispose(): void;
}

export async function initScene(container: HTMLElement): Promise<SceneAPI> {
  // 1. Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.classList.add('scene-canvas');
  container.appendChild(renderer.domElement);

  // 2. Camera
  const width = container.clientWidth;
  const height = container.clientHeight;
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  const cameraBasePosition = new THREE.Vector3(0, 1.8, 4.5);
  camera.position.copy(cameraBasePosition);
  camera.lookAt(0, 1.8, 0);

  // 3. Scene
  const scene = new THREE.Scene();

  // 4. Initial theme
  const theme: 'light' | 'dark' = getCurrentTheme() === 'light' ? 'light' : 'dark';

  // 5. Lighting (always starts dark, then transition if needed)
  const lightingRig = createLighting(scene, renderer);

  // 6. Panels
  const panels = await createPanels(scene, theme);

  // Apply initial theme instantly if light (lighting/panels start dark by default)
  if (theme === 'light') {
    transitionLighting(lightingRig, scene, 'light', 0);
    transitionPanelMaterials(panels, 'light', 0);
  }

  // 6b. Apply initial responsive layout
  applyLayout(panels, camera, cameraBasePosition, width, height, false);

  // 6c. 3D enter button
  const enterButton = create3DButton(scene, theme);
  let assetsPromiseRef: Promise<PreloadedAssets | null> | null = null;
  let drivingUIRef: DrivingUI | null = null;

  // Button raycaster (separate from panel interaction)
  const btnRaycaster = new THREE.Raycaster();
  let btnHovered = false;

  function onBtnPointerDown(e: PointerEvent): void {
    if (getMode() !== 'gallery') return;
    if (!enterButton.mesh.visible) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    btnRaycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
    const hits = btnRaycaster.intersectObject(enterButton.mesh);
    if (hits.length > 0 && assetsPromiseRef && drivingUIRef) {
      e.preventDefault();
      const ui = drivingUIRef;
      assetsPromiseRef.then(assets => {
        if (assets) sceneAPI.enterDriving(assets, ui);
      });
    }
  }
  renderer.domElement.addEventListener('pointerdown', onBtnPointerDown);

  // 7. Interaction
  const interaction = setupInteraction(camera, panels, renderer.domElement, cameraBasePosition);

  // 8. Driving mode state
  let drivingMode: DrivingMode | null = null;

  // 9. Render loop
  const clock = new THREE.Clock();
  let animationId: number;

  function animate() {
    animationId = requestAnimationFrame(animate);

    const dt = clock.getDelta();
    const time = clock.getElapsedTime();
    const mode = getMode();

    // Driving mode — delegate to driving-mode tick
    if (mode === 'driving' && drivingMode) {
      drivingMode.tick(dt);
      renderer.render(scene, camera);
      return;
    }

    // Transitioning — just render, no gallery interaction
    if (mode === 'transitioning') {
      renderer.render(scene, camera);
      return;
    }

    // Gallery mode
    panels.forEach((panel, i) => {
      if (!interaction.focusedPanel) {
        panel.mesh.position.y =
          panel.basePosition.y + Math.sin(time * 1.2 + i * 1.1) * 0.02;
      }
    });

    interaction.update();

    // 3D button hover check
    if (enterButton.mesh.visible && !interaction.focusedPanel) {
      btnRaycaster.setFromCamera(interaction.mouse, camera);
      const btnHits = btnRaycaster.intersectObject(enterButton.mesh);
      if (btnHits.length > 0 && !btnHovered) {
        btnHovered = true;
        gsap.to(enterButton.mesh.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.2 });
        renderer.domElement.style.cursor = 'pointer';
      } else if (btnHits.length === 0 && btnHovered) {
        btnHovered = false;
        gsap.to(enterButton.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
      }
      // Bob the button gently
      enterButton.mesh.position.y = 0.2 + Math.sin(time * 1.5) * 0.015;
    }

    // Cursor light follows mouse
    const nearPlane = new THREE.Vector3(interaction.mouse.x, interaction.mouse.y, 0.5);
    nearPlane.unproject(camera);
    const rayDir = nearPlane.sub(camera.position).normalize();
    const t = -camera.position.z / rayDir.z;
    const hitPoint = camera.position.clone().add(rayDir.multiplyScalar(t));
    lightingRig.cursorLight.position.set(hitPoint.x, hitPoint.y, 1.0);

    renderer.render(scene, camera);
  }
  animate();

  // 10. Responsive resize handler
  let resizeRaf: number | null = null;
  function onResize() {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      applyLayout(panels, camera, cameraBasePosition, w, h, true);
    });
  }
  window.addEventListener('resize', onResize);
  screen.orientation?.addEventListener('change', onResize);

  // 11. Body class
  document.body.classList.add('scene-active');

  // Exit driving helper (needs to be a named function so enterDriving can reference it)
  function exitDrivingFn() {
    if (!drivingMode) return; // guard: still transitioning or already exited
    drivingMode.dispose();
    drivingMode = null;
    interaction.setEnabled(true);
    enterButton.setVisible(true);
    camera.position.copy(cameraBasePosition);
    camera.lookAt(0, cameraBasePosition.y, 0);
    // applyLayout sets the correct FOV for the current viewport
    applyLayout(panels, camera, cameraBasePosition,
      container.clientWidth, container.clientHeight, true);
  }

  // Return API
  const sceneAPI: SceneAPI = {
    onThemeChange(newTheme: 'light' | 'dark') {
      transitionLighting(lightingRig, scene, newTheme);
      transitionPanelMaterials(panels, newTheme);
      updatePanelTextures(panels, newTheme);
      enterButton.updateTexture(newTheme);
    },

    onLangChange() {
      const th = getCurrentTheme() === 'light' ? 'light' : 'dark';
      updatePanelTextures(panels, th);
      enterButton.updateTexture(th);
    },

    setDrivingRefs(assets: Promise<PreloadedAssets | null>, ui: DrivingUI) {
      assetsPromiseRef = assets;
      drivingUIRef = ui;
    },

    async enterDriving(assets: PreloadedAssets, ui: DrivingUI) {
      interaction.setEnabled(false);
      enterButton.setVisible(false);
      drivingMode = await enterDrivingMode(
        scene, camera, renderer, panels, lightingRig, assets,
        exitDrivingFn, ui,
      );
    },

    exitDriving: exitDrivingFn,

    dispose() {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      screen.orientation?.removeEventListener('change', onResize);
      renderer.domElement.removeEventListener('pointerdown', onBtnPointerDown);
      document.body.classList.remove('scene-active');

      interaction.dispose();

      // Dispose panel resources
      panels.forEach((panel) => {
        panel.material.dispose();
        panel.texture.dispose();
        panel.frontMesh.geometry.dispose();
      });

      // Remove meshes from scene
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: THREE.Material) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      container.removeChild(renderer.domElement);
    },
  };

  return sceneAPI;
}
