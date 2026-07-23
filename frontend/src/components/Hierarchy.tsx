import { useQuery } from '@tanstack/react-query';
import { fetchHierarchy } from '../api';
import { tr } from '../i18n';
import { useSelection } from '../store';
import type { TestArea } from '../types';

export function Hierarchy() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['hierarchy'],
    queryFn: fetchHierarchy,
  });
  const areaId = useSelection((s) => s.areaId);
  const setArea = useSelection((s) => s.setArea);

  if (isLoading)
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.app.loading}</p>
    );
  if (error)
    return (
      <p className="text-sm text-rose-600 dark:text-rose-400">{tr.app.loadFailed}</p>
    );
  if (!data) return null;

  return (
    <nav className="space-y-3">
      {data.map(({ category, areas }) => (
        <section key={category.id}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {category.name}
          </h3>
          <ul className="mt-1 space-y-1">
            {areas.map((area: TestArea) => (
              <li key={area.id}>
                <button
                  type="button"
                  onClick={() => setArea(area.id)}
                  className={`w-full rounded px-2 py-1 text-left text-sm transition ${
                    areaId === area.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-800 hover:bg-slate-200 dark:text-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {area.name}{' '}
                  <span
                    className={`text-xs ${
                      areaId === area.id
                        ? 'text-blue-100'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    · {tr.hierarchy.capacity} {area.daily_capacity}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
