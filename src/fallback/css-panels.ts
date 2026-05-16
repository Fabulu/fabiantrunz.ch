import { projects } from '../data/projects';
import { t } from '../i18n';
import { showOverlay } from '../components/overlay';

const MAX_TILT = 10;

export function createFallbackView(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'fallback-wrapper';

  const grid = document.createElement('div');
  grid.className = 'fallback-grid';

  for (const project of projects) {
    const card = document.createElement('div');
    card.className = 'fallback-card';
    card.dataset.projectId = project.id;

    // Icon or placeholder
    if (project.icon) {
      const img = document.createElement('img');
      img.className = 'fallback-card__icon';
      img.src = project.icon;
      img.alt = project.titleKey;
      img.loading = 'lazy';
      card.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'fallback-card__icon--placeholder';
      placeholder.textContent = project.id.charAt(0).toUpperCase();
      card.appendChild(placeholder);
    }

    // Title
    const title = document.createElement('span');
    title.className = 'fallback-card__title';
    title.textContent = project.titleKey;
    card.appendChild(title);

    // Tagline
    const tagline = document.createElement('span');
    tagline.className = 'fallback-card__tagline';
    tagline.dataset.i18n = project.taglineKey;
    tagline.textContent = t(project.taglineKey);
    card.appendChild(tagline);

    // Click -> open overlay
    card.addEventListener('click', () => {
      showOverlay(project.id);
    });

    // 3D tilt on mousemove
    card.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const offsetX = (e.clientX - centerX) / (rect.width / 2);
      const offsetY = (e.clientY - centerY) / (rect.height / 2);
      const tiltX = offsetX * MAX_TILT;
      const tiltY = -offsetY * MAX_TILT;
      card.style.setProperty('--tilt-x', `${tiltX}deg`);
      card.style.setProperty('--tilt-y', `${tiltY}deg`);
      card.style.transform = `perspective(800px) rotateY(${tiltX}deg) rotateX(${tiltY}deg)`;
    });

    // Reset on mouseleave
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.3s ease-out';
      card.style.transform = 'none';
      // Remove transition after it completes so it doesn't interfere with mousemove
      card.addEventListener('transitionend', () => {
        card.style.transition = '';
      }, { once: true });
    });

    grid.appendChild(card);
  }

  wrapper.appendChild(grid);
  return wrapper;
}
