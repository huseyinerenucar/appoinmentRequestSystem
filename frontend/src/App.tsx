import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { HttpError, apiLogout, apiMe } from './api';
import { useAuth } from './auth/store';
import { AdminPanel } from './components/AdminPanel';
import { BookingForm } from './components/BookingForm';
import { Calendar } from './components/Calendar';
import { Hierarchy } from './components/Hierarchy';
import { LoginScreen } from './components/LoginScreen';
import { ThemeToggle } from './components/ThemeToggle';
import { tr } from './i18n';
import { useSelection } from './store';

type View = 'booking' | 'admin';

export default function App() {
  const { token, user, clear, setUser, hydrated, markHydrated } = useAuth();

  useQuery({
    queryKey: ['me', token],
    enabled: !!token && !hydrated,
    queryFn: async () => {
      try {
        const res = await apiMe();
        setUser(res.user);
        return res;
      } catch (err) {
        if (err instanceof HttpError && err.status === 401) clear();
        throw err;
      } finally {
        markHydrated();
      }
    },
    retry: false,
  });
  useEffect(() => {
    if (!token) markHydrated();
  }, [token, markHydrated]);

  if (!token || !user) return <LoginScreen />;

  return <Shell />;
}

function Shell() {
  const user = useAuth((s) => s.user)!;
  const clear = useAuth((s) => s.clear);
  const areaId = useSelection((s) => s.areaId);
  const [view, setView] = useState<View>('booking');

  async function doLogout() {
    try {
      await apiLogout();
    } catch {
      /* ignore — still clear local state */
    }
    clear();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {tr.app.title}
            </h1>
            {user.role === 'admin' && (
              <nav className="flex gap-1 rounded-md bg-slate-100 p-1 text-sm dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setView('booking')}
                  className={`rounded px-3 py-1 ${
                    view === 'booking'
                      ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tr.app.booking}
                </button>
                <button
                  type="button"
                  onClick={() => setView('admin')}
                  className={`rounded px-3 py-1 ${
                    view === 'admin'
                      ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tr.app.admin}
                </button>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <ThemeToggle />
            <div className="text-right">
              <div className="font-medium text-slate-800 dark:text-slate-100">
                {user.full_name ?? user.username}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {tr.app.role[user.role]}
              </div>
            </div>
            <button
              type="button"
              onClick={doLogout}
              className="rounded bg-slate-200 px-3 py-1 text-sm text-slate-800 hover:bg-slate-300
                         dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              {tr.app.logout}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-6">
        {view === 'admin' && user.role === 'admin' ? (
          <AdminPanel />
        ) : (
          <div className="flex gap-6">
            <aside className="w-64 shrink-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-slate-100">
                {tr.app.testAreas}
              </h2>
              <Hierarchy />
            </aside>
            <main className="flex-1 space-y-4">
              {areaId ? (
                <>
                  <Calendar areaId={areaId} />
                  <BookingForm areaId={areaId} />
                </>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm
                                dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  {tr.app.selectArea}
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
