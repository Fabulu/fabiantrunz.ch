import * as THREE from 'three';
import type { Project } from '../data/projects';
import { t } from '../i18n';

const CANVAS_W = 512;
const CANVAS_H = 512;
const FONT_FAMILY = 'Inter, system-ui, sans-serif';

function bgColor(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? '#1a1a2e' : '#dde2ea';
}

function fgColor(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? '#ffffff' : '#1a1a2e';
}

function mutedColor(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? '#d0d0e0' : '#4a4a6a';
}

function drawPlaceholderIcon(
  ctx: CanvasRenderingContext2D,
  project: Project,
  _theme: 'light' | 'dark',
): void {
  const cx = 256;
  const cy = 170;
  const r = 70;

  const gradient = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  gradient.addColorStop(0, '#f59e0b');
  gradient.addColorStop(1, '#d97706');

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 72px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(project.id[0].toUpperCase(), cx, cy);
  ctx.textBaseline = 'alphabetic';
}

function drawTitleAndTags(
  ctx: CanvasRenderingContext2D,
  project: Project,
  theme: 'light' | 'dark',
  titleY: number,
  tagsY: number,
): void {
  ctx.fillStyle = fgColor(theme);
  ctx.font = `bold 52px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText(project.titleKey, CANVAS_W / 2, titleY, 460);

  // Subtitles — wrap if too long
  ctx.fillStyle = mutedColor(theme);
  ctx.font = `28px ${FONT_FAMILY}`;
  const tagText = project.tags.slice(0, 3).join(' \u00b7 ');
  const maxWidth = 420;
  if (ctx.measureText(tagText).width > maxWidth) {
    // Split at middle dot and wrap
    const parts = project.tags.slice(0, 3);
    const half = Math.ceil(parts.length / 2);
    ctx.fillText(parts.slice(0, half).join(' \u00b7 '), CANVAS_W / 2, tagsY, maxWidth);
    ctx.fillText(parts.slice(half).join(' \u00b7 '), CANVAS_W / 2, tagsY + 34, maxWidth);
  } else {
    ctx.fillText(tagText, CANVAS_W / 2, tagsY, maxWidth);
  }
}

function createCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function fillBackground(ctx: CanvasRenderingContext2D, theme: 'light' | 'dark'): void {
  ctx.fillStyle = bgColor(theme);
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Draw a subtle circular border for edge definition (especially in light mode)
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;
  const r = (CANVAS_W / 2) - 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

/**
 * Create a panel texture using a placeholder icon (gradient circle with initial).
 */
export function createPanelTexture(
  project: Project,
  theme: 'light' | 'dark',
): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas();
  fillBackground(ctx, theme);
  drawPlaceholderIcon(ctx, project, theme);
  drawTitleAndTags(ctx, project, theme, 320, 370);

  // DEBUG: verify canvas pixel data matches expected background
  const pixel = ctx.getImageData(256, 256, 1, 1).data;
  console.log(`[texture] ${project.id} center pixel: rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3]})`);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Create a panel texture using a preloaded icon image.
 */
export function createPanelTextureWithIcon(
  project: Project,
  theme: 'light' | 'dark',
  iconImage: HTMLImageElement,
): THREE.CanvasTexture {
  const [canvas, ctx] = createCanvas();
  fillBackground(ctx, theme);

  // Draw icon centered with rounded corners
  const iconSize = 140;
  const iconX = (CANVAS_W - iconSize) / 2;
  const iconY = 80;
  const cornerR = 20;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(iconX, iconY, iconSize, iconSize, cornerR);
  ctx.clip();
  ctx.drawImage(iconImage, iconX, iconY, iconSize, iconSize);
  ctx.restore();

  drawTitleAndTags(ctx, project, theme, 290, 340);

  // DEBUG: verify canvas pixel data matches expected background
  const pixel2 = ctx.getImageData(256, 256, 1, 1).data;
  console.log(`[texture] ${project.id} (icon) center pixel: rgba(${pixel2[0]}, ${pixel2[1]}, ${pixel2[2]}, ${pixel2[3]})`);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Preload all project icons. Returns a map of projectId to loaded HTMLImageElement.
 * Missing or broken icons are silently skipped.
 */
export async function preloadIcons(
  projects: Project[],
): Promise<Map<string, HTMLImageElement>> {
  const icons = new Map<string, HTMLImageElement>();

  const promises = projects
    .filter((p) => p.icon != null)
    .map(
      (p) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            console.log(`[icon] Loaded: ${p.id} from ${p.icon}`);
            icons.set(p.id, img);
            resolve();
          };
          img.onerror = (e) => {
            console.warn(`[icon] Failed to load: ${p.id} from ${p.icon}`, e);
            resolve();
          };
          img.src = p.icon!;
        }),
    );

  await Promise.all(promises);
  return icons;
}

/**
 * Create a texture for the About panel with photo + name.
 */
export async function createAboutTexture(
  theme: 'light' | 'dark',
): Promise<THREE.CanvasTexture> {
  const [canvas, ctx] = createCanvas();
  fillBackground(ctx, theme);

  // Load photo
  const photo = await new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = '/fabian.png';
  });

  // Draw circular photo with cover-fit (preserve aspect ratio, crop to circle)
  const cx = CANVAS_W / 2;
  const cy = 130;
  const r = 70;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  // Cover-fit: scale to fill the circle, show head + shoulders
  const diam = r * 2;
  // Source crop: use a region that shows head + some shoulders
  // The photo is portrait, so width < height. We want a square crop
  // centered horizontally, starting near the top but with a little offset
  // to show some shoulders
  const cropSize = photo.naturalWidth * 0.95; // slightly less than full width
  const sx = (photo.naturalWidth - cropSize) / 2;
  const sy = photo.naturalHeight * 0.08; // offset down to center face in circle
  ctx.drawImage(photo, sx, sy, cropSize, cropSize, cx - r, cy - r, diam, diam);
  ctx.restore();

  // Draw subtle circle border around photo
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = theme === 'dark' ? 'rgba(245,158,11,0.4)' : 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Name — same size as project titles
  ctx.fillStyle = fgColor(theme);
  ctx.font = `bold 52px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('Fabian Trunz', cx, 280);

  // Subtitle — same size as project subtitles
  ctx.fillStyle = mutedColor(theme);
  ctx.font = `28px ${FONT_FAMILY}`;
  ctx.fillText(t('about.tagline'), cx, 320);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
