import { getCurrentTheme, toggleTheme } from '../theme';
import { getCurrentLang, setLang } from '../i18n';

function createSunIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '10');
  circle.setAttribute('cy', '10');
  circle.setAttribute('r', '3.5');
  svg.appendChild(circle);

  const rays = [
    [10, 1.5, 10, 3.5],
    [10, 16.5, 10, 18.5],
    [1.5, 10, 3.5, 10],
    [16.5, 10, 18.5, 10],
    [4, 4, 5.4, 5.4],
    [14.6, 14.6, 16, 16],
    [4, 16, 5.4, 14.6],
    [14.6, 5.4, 16, 4],
  ];

  for (const [x1, y1, x2, y2] of rays) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    svg.appendChild(line);
  }

  return svg;
}

function createMoonIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'M17 11.4A7.5 7.5 0 0 1 8.6 3 7.5 7.5 0 1 0 17 11.4Z',
  );
  svg.appendChild(path);

  return svg;
}

function updateThemeIcon(button: HTMLButtonElement): void {
  while (button.firstChild) {
    button.removeChild(button.firstChild);
  }

  if (getCurrentTheme() === 'light') {
    button.appendChild(createMoonIcon());
  } else {
    button.appendChild(createSunIcon());
  }
}

export function createHeader(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'header';

  const inner = document.createElement('div');
  inner.className = 'header__inner';

  // Logo
  const logo = document.createElement('a');
  logo.href = 'javascript:void(0)';
  logo.className = 'header__logo';
  logo.textContent = 'FT';

  // Controls
  const controls = document.createElement('div');
  controls.className = 'header__controls';

  // Theme toggle
  const themeBtn = document.createElement('button');
  themeBtn.className = 'header__toggle-btn';
  themeBtn.id = 'theme-toggle';
  themeBtn.setAttribute('aria-label', 'Toggle theme');
  updateThemeIcon(themeBtn);

  themeBtn.addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon(themeBtn);
    document.dispatchEvent(new CustomEvent('theme-changed', { detail: getCurrentTheme() }));
  });

  // Lang toggle
  const langBtn = document.createElement('button');
  langBtn.className = 'header__toggle-btn';
  langBtn.id = 'lang-toggle';
  langBtn.setAttribute('aria-label', 'Toggle language');
  langBtn.textContent = getCurrentLang().toUpperCase();

  langBtn.addEventListener('click', () => {
    const newLang = getCurrentLang() === 'de' ? 'en' : 'de';
    setLang(newLang);
    langBtn.textContent = newLang.toUpperCase();
    document.dispatchEvent(new CustomEvent('lang-changed'));
  });

  // GitHub link
  const githubBtn = document.createElement('a');
  githubBtn.href = 'https://github.com/Fabulu';
  githubBtn.target = '_blank';
  githubBtn.rel = 'noopener';
  githubBtn.className = 'header__toggle-btn';
  githubBtn.setAttribute('aria-label', 'GitHub');
  githubBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>';

  // Email link
  const emailBtn = document.createElement('a');
  emailBtn.href = 'mailto:fabian.trunz@gmail.com';
  emailBtn.className = 'header__toggle-btn';
  emailBtn.setAttribute('aria-label', 'Email');
  emailBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>';

  // LinkedIn link
  const linkedinBtn = document.createElement('a');
  linkedinBtn.href = 'https://www.linkedin.com/in/fabian-trunz-456626245/';
  linkedinBtn.target = '_blank';
  linkedinBtn.rel = 'noopener';
  linkedinBtn.className = 'header__toggle-btn';
  linkedinBtn.setAttribute('aria-label', 'LinkedIn');
  linkedinBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';

  controls.appendChild(githubBtn);
  controls.appendChild(emailBtn);
  controls.appendChild(linkedinBtn);
  controls.appendChild(themeBtn);
  controls.appendChild(langBtn);

  inner.appendChild(logo);
  inner.appendChild(controls);
  header.appendChild(inner);

  return header;
}
