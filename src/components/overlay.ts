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
let tagsSection: HTMLElement;
let linksSection: HTMLElement;
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

  tagsSection = document.createElement('div');
  tagsSection.className = 'overlay__tags-section';

  tagsLabel = document.createElement('h3');
  tagsLabel.className = 'overlay__section-label';
  tagsLabel.dataset.i18n = 'overlay.tags';

  tagsContainer = document.createElement('div');
  tagsContainer.className = 'overlay__tags';

  tagsSection.appendChild(tagsLabel);
  tagsSection.appendChild(tagsContainer);

  linksSection = document.createElement('div');
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
  if (!overlay) return;

  // Special "about" overlay
  if (projectId === 'about') {
    showAboutOverlay();
    return;
  }

  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  titleEl.textContent = project.titleKey;

  taglineEl.dataset.i18n = project.taglineKey;
  taglineEl.textContent = t(project.taglineKey);

  descriptionEl.dataset.i18n = project.descriptionKey;
  descriptionEl.textContent = t(project.descriptionKey);

  tagsLabel.textContent = t('overlay.tags');
  linksLabel.textContent = t('overlay.links');

  tagsSection.style.display = '';
  linksSection.style.display = '';
  descriptionEl.style.whiteSpace = '';
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

function showAboutOverlay(): void {
  titleEl.textContent = 'Fabian Trunz';

  taglineEl.dataset.i18n = 'about.tagline';
  taglineEl.textContent = t('about.tagline');

  const edu = t('about.education');
  const work = t('about.work');
  descriptionEl.removeAttribute('data-i18n');
  descriptionEl.textContent = `${edu}\n${work}`;
  descriptionEl.style.whiteSpace = 'pre-line';

  // No tags
  tagsContainer.innerHTML = '';
  tagsSection.style.display = 'none';

  // LinkedIn link
  linksContainer.innerHTML = '';
  linksSection.style.display = '';
  linksLabel.textContent = t('overlay.links');

  const linkedIn = document.createElement('a');
  linkedIn.className = 'overlay__link';
  linkedIn.href = 'https://www.linkedin.com/in/fabian-trunz-456626245/';
  linkedIn.target = '_blank';
  linkedIn.rel = 'noopener noreferrer';
  linkedIn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';
  const linkedInLabel = document.createElement('span');
  linkedInLabel.dataset.i18n = 'about.linkedin';
  linkedInLabel.textContent = t('about.linkedin');
  linkedIn.appendChild(linkedInLabel);
  linksContainer.appendChild(linkedIn);

  overlay!.classList.add('overlay--active');
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
