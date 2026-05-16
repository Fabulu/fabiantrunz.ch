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

  controls.appendChild(themeBtn);
  controls.appendChild(langBtn);

  inner.appendChild(logo);
  inner.appendChild(controls);
  header.appendChild(inner);

  return header;
}
