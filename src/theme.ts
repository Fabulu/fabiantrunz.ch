type Theme = 'light' | 'dark';

let currentTheme: Theme;

export function getCurrentTheme(): Theme {
  return currentTheme;
}

export function initTheme(): void {
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored && (stored === 'light' || stored === 'dark')) {
    currentTheme = stored;
  } else {
    currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  applyTheme();

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      currentTheme = e.matches ? 'dark' : 'light';
      applyTheme();
      document.dispatchEvent(new CustomEvent('theme-changed', { detail: currentTheme }));
    }
  });
}

export function toggleTheme(): void {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', currentTheme);
  applyTheme();
}

function applyTheme(): void {
  document.documentElement.dataset.theme = currentTheme;
}
