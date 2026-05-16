import * as THREE from 'three';
import gsap from 'gsap';
import type { PanelData } from './panels';
import { showOverlay, onOverlayClose } from '../components/overlay';
import { hideUiBar } from '../components/ui-bar';

export interface InteractionState {
  mouse: THREE.Vector2;
  hoveredPanel: PanelData | null;
  focusedPanel: PanelData | null;
  update(): void;
  dispose(): void;
}

export function setupInteraction(
  camera: THREE.PerspectiveCamera,
  panels: PanelData[],
  canvas: HTMLCanvasElement,
  cameraBasePosition: THREE.Vector3,
): InteractionState {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const tiltTarget = new THREE.Vector2();

  let hoveredPanel: PanelData | null = null;
  let focusedPanel: PanelData | null = null;

  // Spotlight for focused panel
  let focusSpot: THREE.PointLight | null = null;

  // Edge outline for focused panel (RingGeometry approach)
  let outlineMesh: THREE.Mesh | null = null;
  const outlineRingGeo = new THREE.RingGeometry(0.59, 0.63, 48);

  function createOutline(panel: PanelData): void {
    removeOutline();
    const isDark = document.documentElement.dataset.theme !== 'light';
    const mat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x3366aa : 0x6699cc,
      transparent: true,
      opacity: 0,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    outlineMesh = new THREE.Mesh(outlineRingGeo, mat);
    outlineMesh.position.z = 0.005;
    outlineMesh.name = 'panelOutline';
    panel.mesh.add(outlineMesh);

    const targetOpacity = isDark ? 0.6 : 0.4;
    gsap.to(mat, { opacity: targetOpacity, duration: 0.35, ease: 'power2.out' });
  }

  function removeOutline(): void {
    if (outlineMesh) {
      const mesh = outlineMesh;
      gsap.to(mesh.material as THREE.MeshBasicMaterial, {
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          mesh.removeFromParent();
          (mesh.material as THREE.Material).dispose();
        },
      });
      outlineMesh = null;
    }
  }

  // Ensure touch works with pointer events
  canvas.style.touchAction = 'none';

  /* ------------------------------------------------------------------ */
  /*  Pointer-move: track NDC mouse position                            */
  /* ------------------------------------------------------------------ */
  function onPointerMove(e: PointerEvent): void {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  /* ------------------------------------------------------------------ */
  /*  Pointer-down: click / tap                                         */
  /* ------------------------------------------------------------------ */
  function onPointerDown(_e: PointerEvent): void {
    if (hoveredPanel && !focusedPanel) {
      focusPanel(hoveredPanel);
    }
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);

  /* ------------------------------------------------------------------ */
  /*  Focus a panel                                                     */
  /* ------------------------------------------------------------------ */
  function focusPanel(panel: PanelData): void {
    focusedPanel = panel;
    hideUiBar();

    // Move focused panel to fixed left position and tilt to face camera
    gsap.to(panel.mesh.position, {
      x: -1.2,
      y: 0,
      z: 2.0,
      duration: 0.6,
      ease: 'power2.out',
    });

    // Tilt to face camera directly (rotation Y = 0)
    gsap.to(panel.mesh.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.6,
      ease: 'power2.out',
    });

    // Scale up focused panel slightly for emphasis
    gsap.to(panel.mesh.scale, {
      x: 1.15,
      y: 1.15,
      z: 1.15,
      duration: 0.6,
      ease: 'power2.out',
    });

    // Create edge outline
    createOutline(panel);

    // Add a dedicated light on the focused panel — offset above & right
    // to avoid specular flare landing on the title text
    focusSpot = new THREE.PointLight(0xffffff, 8, 6, 1.5);
    focusSpot.position.set(-0.5, 1.2, 3.0);
    panels[0].mesh.parent!.add(focusSpot);
    focusSpot.intensity = 0;
    gsap.to(focusSpot, { intensity: 8, duration: 0.5 });

    // Fade other panels
    for (const p of panels) {
      if (p === panel) continue;
      p.material.transparent = true;
      gsap.to(p.material, { opacity: 0.15, duration: 0.4 });
    }

    showOverlay(panel.project.id);

    onOverlayClose(() => {
      unfocusPanel();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Unfocus (overlay closed)                                          */
  /* ------------------------------------------------------------------ */
  function unfocusPanel(): void {
    if (!focusedPanel) return;

    // Remove outline and focus spotlight
    removeOutline();
    if (focusSpot) {
      const spot = focusSpot;
      gsap.to(spot, { intensity: 0, duration: 0.3, onComplete: () => {
        spot.removeFromParent();
        spot.dispose();
      }});
      focusSpot = null;
    }
    gsap.to(focusedPanel.mesh.scale, {
      x: 1, y: 1, z: 1,
      duration: 0.6,
      ease: 'power2.out',
    });

    // Restore focused panel position and rotation
    gsap.to(focusedPanel.mesh.position, {
      x: focusedPanel.basePosition.x,
      y: focusedPanel.basePosition.y,
      z: focusedPanel.basePosition.z,
      duration: 0.6,
      ease: 'power2.out',
    });

    gsap.to(focusedPanel.mesh.rotation, {
      x: focusedPanel.baseRotation.x,
      y: focusedPanel.baseRotation.y,
      z: focusedPanel.baseRotation.z,
      duration: 0.6,
      ease: 'power2.out',
    });

    // Restore other panels opacity
    for (const p of panels) {
      if (p === focusedPanel) continue;
      gsap.to(p.material, {
        opacity: 1,
        duration: 0.4,
        onComplete() {
          p.material.transparent = false;
        },
      });
    }

    focusedPanel = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Hover helpers                                                     */
  /* ------------------------------------------------------------------ */
  function onHoverEnter(panel: PanelData): void {
    canvas.style.cursor = 'pointer';
    gsap.to(panel.mesh.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.3 });
  }

  function onHoverLeave(panel: PanelData): void {
    canvas.style.cursor = 'default';
    gsap.to(panel.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
    gsap.to(panel.mesh.rotation, {
      x: panel.baseRotation.x,
      y: panel.baseRotation.y,
      duration: 0.4,
    });
    tiltTarget.set(0, 0);
  }

  /* ------------------------------------------------------------------ */
  /*  Per-frame update                                                  */
  /* ------------------------------------------------------------------ */
  function update(): void {
    // --- Raycasting ---
    raycaster.setFromCamera(mouse, camera);
    const frontMeshes = panels.map((p) => p.frontMesh);
    const intersects = raycaster.intersectObjects(frontMeshes);

    let newHovered: PanelData | null = null;
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      newHovered = panels.find((p) => p.frontMesh === hitMesh) ?? null;
    }

    // Hover transitions (only when not focused)
    if (!focusedPanel) {
      if (newHovered !== hoveredPanel) {
        if (hoveredPanel) onHoverLeave(hoveredPanel);
        if (newHovered) onHoverEnter(newHovered);
        hoveredPanel = newHovered;
      }

      // Tilt toward intersection point
      if (hoveredPanel && intersects.length > 0) {
        const localPt = hoveredPanel.frontMesh.worldToLocal(
          intersects[0].point.clone(),
        );
        const MAX_TILT = 0.14; // ~8 degrees
        // Tilt on X based on local Y, tilt on Y based on local X
        tiltTarget.x = -localPt.y * MAX_TILT * 2;
        tiltTarget.y = localPt.x * MAX_TILT * 2;
        // Clamp
        tiltTarget.x = THREE.MathUtils.clamp(tiltTarget.x, -MAX_TILT, MAX_TILT);
        tiltTarget.y = THREE.MathUtils.clamp(tiltTarget.y, -MAX_TILT, MAX_TILT);

        // Lerp rotation toward tilt target
        hoveredPanel.mesh.rotation.x +=
          (hoveredPanel.baseRotation.x + tiltTarget.x - hoveredPanel.mesh.rotation.x) * 0.1;
        hoveredPanel.mesh.rotation.y +=
          (hoveredPanel.baseRotation.y + tiltTarget.y - hoveredPanel.mesh.rotation.y) * 0.1;
      }
    } else {
      // While focused, clear hover state
      if (hoveredPanel) {
        onHoverLeave(hoveredPanel);
        hoveredPanel = null;
      }
    }

    // --- Camera parallax ---
    if (!focusedPanel) {
      const targetX = cameraBasePosition.x + mouse.x * 0.15;
      const targetY = cameraBasePosition.y + mouse.y * 0.08;
      camera.position.x += (targetX - camera.position.x) * 0.03;
      camera.position.y += (targetY - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Dispose                                                           */
  /* ------------------------------------------------------------------ */
  function dispose(): void {
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerdown', onPointerDown);
  }

  /* ------------------------------------------------------------------ */
  /*  Return state object                                               */
  /* ------------------------------------------------------------------ */
  const state: InteractionState = {
    mouse,
    get hoveredPanel() {
      return hoveredPanel;
    },
    get focusedPanel() {
      return focusedPanel;
    },
    update,
    dispose,
  };

  return state;
}
