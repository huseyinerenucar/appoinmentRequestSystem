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

  if (isLoading) return <p className="text-sm text-slate-500">{tr.app.loading}</p>;
  if (error) return <p className="text-sm text-rose-600">{tr.app.loadFailed}</p>;
  if (!data) return null;

  return (
    <nav className="space-y-4">
      {data.map((node) => (
        <section key={node.location.id}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {node.location.name}{' '}
            <span className="text-slate-400 normal-case">({node.location.timezone})</span>
          </h2>
          {node.categories.map(({ category, areas }) => (
            <div key={category.id} className="mt-2">
              <h3 className="text-xs font-medium text-slate-600">{category.name}</h3>
              <ul className="mt-1 space-y-1">
                {areas.map((area: TestArea) => (
                  <li key={area.id}>
                    <button
                      type="button"
                      onClick={() => setArea(area.id)}
                      className={`w-full text-left rounded px-2 py-1 text-sm transition ${
                        areaId === area.id
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-slate-200'
                      }`}
                    >
                      {area.name}{' '}
                      <span
                        className={`text-xs ${
                          areaId === area.id ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        · {tr.hierarchy.capacity} {area.daily_capacity}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </nav>
  );
}
