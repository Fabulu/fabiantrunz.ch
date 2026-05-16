import { translations } from './data/translations';

type Lang = 'de' | 'en';

let currentLang: Lang;

export function getCurrentLang(): Lang {
  return currentLang;
}

export function initLang(): void {
  const stored = localStorage.getItem('lang') as Lang | null;
  if (stored && (stored === 'de' || stored === 'en')) {
    currentLang = stored;
  } else {
    currentLang = navigator.language.startsWith('de') ? 'de' : 'en';
  }
  document.documentElement.lang = currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  translatePage();
}

export function t(key: string): string {
  const entry = translations[key];
  if (!entry) {
    console.warn(`Missing translation key: ${key}`);
    return key;
  }
  return entry[currentLang];
}

export function translatePage(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n!;
    el.textContent = t(key);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach(el => {
    const key = el.dataset.i18nHtml!;
    el.innerHTML = t(key);
  });
  document.title = 'Fabian Trunz — ' + t('meta.description');
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', t('meta.description'));
}
