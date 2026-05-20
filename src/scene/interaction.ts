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
  setEnabled(v: boolean): void;
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
  let enabled = true;

  function setEnabled(v: boolean): void {
    enabled = v;
    if (!v) {
      if (hoveredPanel) onHoverLeave(hoveredPanel);
      hoveredPanel = null;
      canvas.style.cursor = 'default';
    }
  }

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
  const isTouch = 'ontouchstart' in window;

  function onPointerMove(e: PointerEvent): void {
    // Skip hover tracking on touch — prevents fight with tap focus
    if (isTouch) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /* ------------------------------------------------------------------ */
  /*  Tap / click — pointerdown is fastest and most reliable on mobile  */
  /* ------------------------------------------------------------------ */
  let tapHandled = false;

  function handleTap(clientX: number, clientY: number): boolean {
    if (!enabled) return false;
    if (tapHandled) return false;
    if (focusedPanel) return false;

    // Use canvas bounding rect, not window dimensions — on mobile the
    // address bar makes window.innerHeight differ from actual canvas size
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    // World matrices may be stale (bob animation changed position since last render).
    // Force update so the raycast tests against actual current positions.
    for (const p of panels) {
      p.mesh.updateWorldMatrix(true, true);
    }

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(panels.map(p => p.frontMesh), false);
    if (hits.length > 0) {
      const tapped = panels.find(p => p.frontMesh === hits[0].object);
      if (tapped) {
        tapHandled = true;
        setTimeout(() => { tapHandled = false; }, 400);
        focusPanel(tapped);
        return true;
      }
    }
    return false;
  }

  function onPointerDown(e: PointerEvent): void {
    if (handleTap(e.clientX, e.clientY)) e.preventDefault();
  }

  function onTouchStart(e: TouchEvent): void {
    const t = e.touches[0];
    if (t && handleTap(t.clientX, t.clientY)) e.preventDefault();
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });

  /* ------------------------------------------------------------------ */
  /*  Focus a panel                                                     */
  /* ------------------------------------------------------------------ */
  function focusPanel(panel: PanelData): void {
    focusedPanel = panel;
    gsap.killTweensOf(panel.mesh.position);
    gsap.killTweensOf(panel.mesh.rotation);
    gsap.killTweensOf(panel.mesh.scale);
    hideUiBar();

    // Move focused panel based on layout mode
    const isPortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
    const isLandscapeMobile = window.innerHeight < 500;

    let focusX = -1.2, focusY = 1.5, focusZ = 2.0; // +1.5 for camera lift
    if (isPortrait) {
      focusX = 0;
      focusY = 3.0; // above overlay text
      focusZ = 2.2;
    } else if (isLandscapeMobile) {
      focusX = -1.2;
      focusY = 1.5; // +1.5 for camera lift
      focusZ = 1.5;
    }

    gsap.to(panel.mesh.position, {
      x: focusX,
      y: focusY,
      z: focusZ,
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

    // Scale up focused panel per layout
    const isLandscape = window.innerHeight < 500;
    const isFeatured = panels.indexOf(panel) === 0;
    const isAbout = panels.indexOf(panel) === panels.length - 1;
    let scaleMul = 1.2;
    if (isLandscape) scaleMul = 1.0;
    else if (isPortrait && isAbout) scaleMul = 1.3; // about card bigger in portrait
    else if (isPortrait) scaleMul = 1.0;
    else if (isFeatured) scaleMul = 1.05;
    const fs = panel.baseScale * scaleMul;
    gsap.to(panel.mesh.scale, {
      x: fs,
      y: fs,
      z: fs,
      duration: 0.6,
      ease: 'power2.out',
    });

    // Create edge outline
    createOutline(panel);

    // Add a dedicated light on the focused panel — offset above & right
    // to avoid specular flare landing on the title text
    focusSpot = new THREE.PointLight(0xffffff, 8, 6, 1.5);
    focusSpot.position.set(-0.5, 2.7, 3.0); // +1.5 for camera lift
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
    gsap.killTweensOf(focusedPanel.mesh.position);
    gsap.killTweensOf(focusedPanel.mesh.rotation);
    gsap.killTweensOf(focusedPanel.mesh.scale);
    const rs = focusedPanel.baseScale;
    gsap.to(focusedPanel.mesh.scale, {
      x: rs, y: rs, z: rs,
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
    const s = panel.baseScale * 1.1;
    gsap.to(panel.mesh.scale, { x: s, y: s, z: s, duration: 0.3 });
  }

  function onHoverLeave(panel: PanelData): void {
    canvas.style.cursor = 'default';
    const s = panel.baseScale;
    gsap.to(panel.mesh.scale, { x: s, y: s, z: s, duration: 0.3 });
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
    if (!enabled) return;
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
      camera.lookAt(0, cameraBasePosition.y, 0);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Dispose                                                           */
  /* ------------------------------------------------------------------ */
  function dispose(): void {
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('touchstart', onTouchStart);
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
    setEnabled,
  };

  return state;
}
