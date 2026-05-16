import { projects } from '../data/projects';
import { t } from '../i18n';

let overlay: HTMLElement | null = null;
let titleEl: HTMLElement;
let taglineEl: HTMLElement;
let descriptionEl: HTMLElement;
let tagsContainer: HTMLElement;
let linksContainer: HTMLElement;
let tagsLabel: HTMLElement;
let linksLabel: HTMLElement;
let active = false;

const closeCallbacks: (() => void)[] = [];

function handleEscape(e: KeyboardEvent): void {
  if (e.key === 'Escape') hideOverlay();
}

const linkIcons: Record<string, string> = {
  website: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`,
  github: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
  </svg>`,
  store: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`,
  donate: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>`,
};

export function createOverlay(): HTMLElement {
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'project-overlay';

  const backdrop = document.createElement('div');
  backdrop.className = 'overlay__backdrop';
  backdrop.addEventListener('click', hideOverlay);

  const card = document.createElement('div');
  card.className = 'overlay__card';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'overlay__close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;
  closeBtn.addEventListener('click', hideOverlay);

  titleEl = document.createElement('h2');
  titleEl.className = 'overlay__title';

  taglineEl = document.createElement('p');
  taglineEl.className = 'overlay__tagline';

  descriptionEl = document.createElement('p');
  descriptionEl.className = 'overlay__description';

  const tagsSection = document.createElement('div');
  tagsSection.className = 'overlay__tags-section';

  tagsLabel = document.createElement('h3');
  tagsLabel.className = 'overlay__section-label';
  tagsLabel.dataset.i18n = 'overlay.tags';

  tagsContainer = document.createElement('div');
  tagsContainer.className = 'overlay__tags';

  tagsSection.appendChild(tagsLabel);
  tagsSection.appendChild(tagsContainer);

  const linksSection = document.createElement('div');
  linksSection.className = 'overlay__links-section';

  linksLabel = document.createElement('h3');
  linksLabel.className = 'overlay__section-label';
  linksLabel.dataset.i18n = 'overlay.links';

  linksContainer = document.createElement('div');
  linksContainer.className = 'overlay__links';

  linksSection.appendChild(linksLabel);
  linksSection.appendChild(linksContainer);

  card.appendChild(closeBtn);
  card.appendChild(titleEl);
  card.appendChild(taglineEl);
  card.appendChild(descriptionEl);
  card.appendChild(tagsSection);
  card.appendChild(linksSection);

  overlay.appendChild(backdrop);
  overlay.appendChild(card);

  return overlay;
}

export function showOverlay(projectId: string): void {
  const project = projects.find(p => p.id === projectId);
  if (!project || !overlay) return;

  titleEl.textContent = project.titleKey;

  taglineEl.dataset.i18n = project.taglineKey;
  taglineEl.textContent = t(project.taglineKey);

  descriptionEl.dataset.i18n = project.descriptionKey;
  descriptionEl.textContent = t(project.descriptionKey);

  tagsLabel.textContent = t('overlay.tags');
  linksLabel.textContent = t('overlay.links');

  tagsContainer.innerHTML = '';
  for (const tag of project.tags) {
    const span = document.createElement('span');
    span.className = 'overlay__tag';
    span.textContent = tag;
    tagsContainer.appendChild(span);
  }

  linksContainer.innerHTML = '';
  for (const link of project.links) {
    const a = document.createElement('a');
    a.className = 'overlay__link';
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    const icon = linkIcons[link.type] ?? '';
    a.innerHTML = icon;

    const span = document.createElement('span');
    span.dataset.i18n = link.labelKey;
    span.textContent = t(link.labelKey);
    a.appendChild(span);

    linksContainer.appendChild(a);
  }

  overlay.classList.add('overlay--active');
  active = true;
  document.addEventListener('keydown', handleEscape);
}

export function hideOverlay(): void {
  if (!overlay) return;
  overlay.classList.remove('overlay--active');
  active = false;
  document.removeEventListener('keydown', handleEscape);
  for (const cb of closeCallbacks) cb();
  closeCallbacks.length = 0;
}

export function isOverlayActive(): boolean {
  return active;
}

export function onOverlayClose(callback: () => void): void {
  closeCallbacks.push(callback);
}
