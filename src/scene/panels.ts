import * as THREE from 'three';
import type { Project } from '../data/projects';
import { createPanelTexture, createPanelTextureWithIcon, preloadIcons } from './canvas-texture';
import { projects } from '../data/projects';

export interface PanelData {
  mesh: THREE.Object3D;
  frontMesh: THREE.Mesh;
  project: Project;
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
  texture: THREE.CanvasTexture;
  material: THREE.MeshPhysicalMaterial;
}

const Y_OFFSETS = [-0.03, 0.02, -0.01, 0.04, -0.02, 0.01];

export async function createPanels(
  scene: THREE.Scene,
  theme: 'light' | 'dark',
): Promise<PanelData[]> {
  const iconMap = await preloadIcons(projects);
  cachedIconMap = iconMap;

  // Circle panel — CircleGeometry (front face with proper UVs)
  const radius = 0.6;
  const frontGeo = new THREE.CircleGeometry(radius, 48);
  const backGeo = new THREE.CircleGeometry(radius, 48);
  // Back face: flip to face the other direction
  backGeo.rotateY(Math.PI);
  const panels: PanelData[] = [];

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];

    // Create texture — use icon variant if an icon was preloaded
    const iconImage = iconMap.get(project.id);
    const texture = iconImage
      ? createPanelTextureWithIcon(project, theme, iconImage)
      : createPanelTexture(project, theme);

    // MeshPhysicalMaterial with surgical settings to avoid "white veil":
    // - toneMapped=false: bypasses ACES tone mapping that lifts midtones
    // - envMapIntensity=0: no IBL irradiance or specular reflection from environment
    // - transmission=0: no see-through to bright background
    // - clearcoat provides ONLY a subtle gloss sheen (view-dependent highlight)
    // - Very low metalness + high roughness = minimal specular from direct lights
    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.4,          // low roughness = shiny specular highlights
      clearcoat: 0.7,          // glossy lacquer layer
      clearcoatRoughness: 0.15,
      envMapIntensity: 0,      // no environment IBL (was the veil cause)
      envMap: null,
      reflectivity: 0.3,
      transmission: 0,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    material.toneMapped = false; // bypass ACES — colorSpace fix handles correctness
    material.side = THREE.FrontSide;

    // Back material — simple, no texture
    const backMaterial = new THREE.MeshBasicMaterial({
      color: theme === 'light' ? 0xe8e8f0 : 0x1a1a2e,
    });

    const frontMesh = new THREE.Mesh(frontGeo, material);
    const backMesh = new THREE.Mesh(backGeo, backMaterial);
    backMesh.position.z = -0.01; // tiny offset behind front

    // Use a Group as the "mesh" for positioning
    const mesh = new THREE.Group();
    mesh.add(frontMesh);
    mesh.add(backMesh);

    // Layout: shallow arc
    const x = -3.0 + i * 1.2;
    const z = 0.2 * Math.pow(x / 3.0, 2);
    const y = Y_OFFSETS[i] ?? 0;
    const rotationY = Math.atan2(x, 6.0) * 0.4;

    mesh.position.set(x, y, z);
    mesh.rotation.set(0, rotationY, 0);

    const basePosition = new THREE.Vector3(x, y, z);
    const baseRotation = new THREE.Euler(0, rotationY, 0);

    scene.add(mesh);

    panels.push({
      mesh,
      frontMesh,
      project,
      basePosition,
      baseRotation,
      texture,
      material,
    });
  }

  return panels;
}

export function transitionPanelMaterials(
  panels: PanelData[],
  theme: 'light' | 'dark',
  _overrideDuration?: number,
): void {
  // Material stays mostly the same between themes — the texture handles
  // colour differences. We only adjust the back face colour.
  // Key invariants that prevent the "white veil":
  //   toneMapped=false, envMapIntensity=0, transmission=0, roughness=1
  for (const panel of panels) {
    const backMesh = (panel.mesh as THREE.Group).children.find(
      (c) => c !== panel.frontMesh,
    ) as THREE.Mesh | undefined;
    if (backMesh && backMesh.material instanceof THREE.MeshBasicMaterial) {
      backMesh.material.color.set(theme === 'light' ? 0xe8e8f0 : 0x1a1a2e);
    }
  }
}

// Store icon map for texture rebuilds
let cachedIconMap: Map<string, HTMLImageElement> | null = null;

export function setIconMap(map: Map<string, HTMLImageElement>): void {
  cachedIconMap = map;
}

export function updatePanelTextures(
  panels: PanelData[],
  theme: 'light' | 'dark',
): void {
  for (const panel of panels) {
    panel.texture.dispose();

    const iconImage = cachedIconMap?.get(panel.project.id);
    const newTexture = iconImage
      ? createPanelTextureWithIcon(panel.project, theme, iconImage)
      : createPanelTexture(panel.project, theme);

    panel.texture = newTexture;
    panel.material.map = newTexture;
    panel.material.needsUpdate = true;
  }
}
