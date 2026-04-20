import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { HttpError, apiLogout, apiMe } from './api';
import { useAuth } from './auth/store';
import { AdminPanel } from './components/AdminPanel';
import { BookingForm } from './components/BookingForm';
import { Calendar } from './components/Calendar';
import { Hierarchy } from './components/Hierarchy';
import { LoginScreen } from './components/LoginScreen';
import { tr } from './i18n';
import { useSelection } from './store';

type View = 'booking' | 'admin';

export default function App() {
  const { token, user, clear, setUser, hydrated, markHydrated } = useAuth();

  // Validate cached token on startup.
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
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold text-slate-900">{tr.app.title}</h1>
            {user.role === 'admin' && (
              <nav className="flex gap-1 rounded-md bg-slate-100 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setView('booking')}
                  className={`rounded px-3 py-1 ${
                    view === 'booking' ? 'bg-white shadow' : 'text-slate-600'
                  }`}
                >
                  {tr.app.booking}
                </button>
                <button
                  type="button"
                  onClick={() => setView('admin')}
                  className={`rounded px-3 py-1 ${
                    view === 'admin' ? 'bg-white shadow' : 'text-slate-600'
                  }`}
                >
                  {tr.app.admin}
                </button>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="font-medium text-slate-800">
                {user.full_name ?? user.username}
              </div>
              <div className="text-xs text-slate-500">
                {tr.app.role[user.role]}
              </div>
            </div>
            <button
              type="button"
              onClick={doLogout}
              className="rounded bg-slate-200 px-3 py-1 text-sm hover:bg-slate-300"
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
            <aside className="w-64 shrink-0 rounded-lg border bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-bold">{tr.app.testAreas}</h2>
              <Hierarchy />
            </aside>
            <main className="flex-1 space-y-4">
              {areaId ? (
                <>
                  <Calendar areaId={areaId} />
                  <BookingForm areaId={areaId} />
                </>
              ) : (
                <div className="rounded-lg border bg-white p-8 text-center text-slate-500 shadow-sm">
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
