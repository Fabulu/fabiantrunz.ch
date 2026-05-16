import { t } from '../i18n';

let barElement: HTMLElement | null = null;

export function createUiBar(): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'ui-bar';

  const hint = document.createElement('span');
  hint.dataset.i18n = 'ui.scroll_hint';
  hint.textContent = t('ui.scroll_hint');
  bar.appendChild(hint);

  // Auto-hide after 4 seconds
  setTimeout(() => {
    bar.classList.add('ui-bar--hidden');
  }, 4000);

  barElement = bar;
  return bar;
}

export function hideUiBar(): void {
  if (barElement) {
    barElement.classList.add('ui-bar--hidden');
  }
}
