import * as THREE from 'three';
import gsap from 'gsap';
import { createLighting, transitionLighting } from './lighting';
import { createPanels, transitionPanelMaterials, updatePanelTextures } from './panels';
import type { PanelData } from './panels';
import { setupInteraction } from './interaction';
import { getCurrentTheme } from '../theme';

// Responsive layout positions
const DESKTOP_POSITIONS: [number, number, number][] = [
  [-3.0, 0.2, 0.2], [-1.8, 0.25, 0.072], [-0.6, 0.22, 0.008],
  [0.6, 0.27, 0.008], [1.8, 0.21, 0.072], [3.0, 0.24, 0.2],
  [0, -0.85, 0.1],
];

const PORTRAIT_POSITIONS: [number, number, number][] = [
  [-0.8, 1.8, 0], [0.8, 1.8, 0],
  [-0.8, 0.55, 0], [0.8, 0.55, 0],
  [-0.8, -0.7, 0], [0.8, -0.7, 0],
  [0, -1.8, 0],
];

// Landscape mobile positions: two rows
const LANDSCAPE_POSITIONS: [number, number, number][] = [
  [-1.8, 0.55, 0], [-0.6, 0.55, 0], [0.6, 0.55, 0], [1.8, 0.55, 0],
  [-1.2, -0.55, 0], [0, -0.55, 0], [1.2, -0.55, 0],
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
    camPos = [0, 0, 5.0];
    panelScale = 0.65;
    aboutScale = 0.6;
  } else if (mode === 'landscape-mobile') {
    positions = LANDSCAPE_POSITIONS;
    fov = 50;
    camPos = [0, 0, 3.5];
    panelScale = 0.7;
    aboutScale = 0.65;
  } else {
    positions = DESKTOP_POSITIONS;
    fov = 50;
    camPos = [0, 0.3, 4.5];
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

export interface SceneAPI {
  onThemeChange(theme: 'light' | 'dark'): void;
  onLangChange(): void;
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
  const cameraBasePosition = new THREE.Vector3(0, 0.3, 4.5);
  camera.position.copy(cameraBasePosition);
  camera.lookAt(0, 0, 0);

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

  // 7. Interaction
  const interaction = setupInteraction(camera, panels, renderer.domElement, cameraBasePosition);

  // 8 & 9. Render loop with idle bob
  const clock = new THREE.Clock();
  let animationId: number;

  function animate() {
    animationId = requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    // Idle bob animation
    panels.forEach((panel, i) => {
      if (!interaction.focusedPanel) {
        panel.mesh.position.y =
          panel.basePosition.y + Math.sin(time * 1.2 + i * 1.1) * 0.02;
      }
    });

    interaction.update();

    // Cursor light follows mouse — unproject NDC to world at panel plane (z=0),
    // then position the light slightly in front of the panels so it illuminates them
    const nearPlane = new THREE.Vector3(interaction.mouse.x, interaction.mouse.y, 0.5);
    nearPlane.unproject(camera);
    const rayDir = nearPlane.sub(camera.position).normalize();
    const t = -camera.position.z / rayDir.z; // intersect z=0
    const hitPoint = camera.position.clone().add(rayDir.multiplyScalar(t));
    // Position light directly at cursor's world position on the panel plane
    // With soft clearcoat (roughness 0.65), specular is broad enough not to need overshoot
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

  // Return API
  return {
    onThemeChange(newTheme: 'light' | 'dark') {
      transitionLighting(lightingRig, scene, newTheme);
      transitionPanelMaterials(panels, newTheme);
      updatePanelTextures(panels, newTheme);
    },

    onLangChange() {
      updatePanelTextures(panels, getCurrentTheme() === 'light' ? 'light' : 'dark');
    },

    dispose() {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
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
}
