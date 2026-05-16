import * as THREE from 'three';
import { createLighting, transitionLighting } from './lighting';
import { createPanels, transitionPanelMaterials, updatePanelTextures } from './panels';
import { setupInteraction } from './interaction';
import { getCurrentTheme } from '../theme';

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

  // 10. Resize handler
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

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
