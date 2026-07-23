import { tr } from '../i18n';
import { useTheme } from '../theme';

export function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? tr.app.themeLight : tr.app.themeDark}
      title={isDark ? tr.app.themeLight : tr.app.themeDark}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300
                 bg-white text-slate-700 transition hover:bg-slate-100
                 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm4.95 2.636a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM18 10a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM5.464 5.464A1 1 0 0 1 4.05 6.05l-.707-.707a1 1 0 1 1 1.414-1.414l.707.707ZM3 9a1 1 0 1 1 0 2H2a1 1 0 1 1 0-2h1Zm2.05 5.95a1 1 0 0 1 1.414 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707ZM10 16a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm4.95-1.05a1 1 0 0 1 1.414 0l.707.707a1 1 0 1 1-1.414 1.414l-.707-.707a1 1 0 0 1 0-1.414ZM10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M17.293 13.293A8 8 0 0 1 6.707 2.707a8.001 8.001 0 1 0 10.586 10.586Z" />
        </svg>
      )}
    </button>
  );
}
