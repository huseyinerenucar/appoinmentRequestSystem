import { useQuery } from '@tanstack/react-query';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useMemo, useState } from 'react';
import { fetchAvailability } from '../api';
import { tr } from '../i18n';
import { useSelection } from '../store';
import type { DayAvailability } from '../types';

interface Props {
  areaId: number;
}

export function Calendar({ areaId }: Props) {
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const rangeStart = useSelection((s) => s.rangeStart);
  const rangeEnd = useSelection((s) => s.rangeEnd);
  const setRange = useSelection((s) => s.setRange);

  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });

  const startStr = format(gridStart, 'yyyy-MM-dd');
  const endStr = format(gridEnd, 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['availability', areaId, startStr, endStr],
    queryFn: () => fetchAvailability(areaId, startStr, endStr),
  });

  const dayMap = useMemo(() => {
    const m = new Map<string, DayAvailability>();
    data?.days.forEach((d) => m.set(d.date, d));
    return m;
  }, [data]);

  const days: Date[] = useMemo(() => {
    const out: Date[] = [];
    const cur = new Date(gridStart);
    while (cur <= gridEnd) {
      out.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [gridStart, gridEnd]);

  function onClickDay(d: Date) {
    const iso = format(d, 'yyyy-MM-dd');
    const slot = dayMap.get(iso);
    if (slot?.blacklisted) return;
    if (slot && slot.available <= 0) return;

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRange(iso, null);
      return;
    }
    if (rangeStart && !rangeEnd) {
      if (iso < rangeStart) setRange(iso, rangeStart);
      else setRange(rangeStart, iso);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="rounded bg-slate-100 px-2 py-1 text-sm text-slate-700 hover:bg-slate-200
                     dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          onClick={() => setCursor(subMonths(cursor, 1))}
        >
          ←
        </button>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {format(cursor, 'MMMM yyyy')}
        </h2>
        <button
          type="button"
          className="rounded bg-slate-100 px-2 py-1 text-sm text-slate-700 hover:bg-slate-200
                     dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          onClick={() => setCursor(addMonths(cursor, 1))}
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-slate-500 dark:text-slate-400">
        {tr.calendar.days.map((d) => (
          <div key={d} className="text-center font-medium">{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const iso = format(d, 'yyyy-MM-dd');
          const slot = dayMap.get(iso);
          const otherMonth = !isSameMonth(d, cursor);
          const inRange =
            rangeStart &&
            (rangeEnd
              ? !isBefore(d, parseISO(rangeStart)) && !isAfter(d, parseISO(rangeEnd))
              : isSameDay(d, parseISO(rangeStart)));
          const disabled =
            !slot || slot.blacklisted || slot.available <= 0;

          const heat =
            !slot
              ? 'bg-slate-50 dark:bg-slate-900'
              : slot.blacklisted
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                : slot.available === 0
                  ? 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                  : slot.available < slot.capacity
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onClickDay(d)}
              disabled={disabled}
              title={
                slot
                  ? slot.blacklisted
                    ? tr.calendar.blacklistTitle
                    : tr.calendar.availableOf(slot.available, slot.capacity)
                  : ''
              }
              className={`aspect-square rounded text-xs transition
                ${heat}
                ${otherMonth ? 'opacity-50' : ''}
                ${inRange ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                ${disabled ? 'cursor-not-allowed' : 'hover:brightness-95'}`}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <span className="font-medium">{format(d, 'd')}</span>
                {slot && !slot.blacklisted && (
                  <span className="text-[10px]">
                    {slot.available}/{slot.capacity}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-emerald-100 dark:bg-emerald-900/40" />{' '}
          {tr.calendar.free}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-amber-100 dark:bg-amber-900/40" />{' '}
          {tr.calendar.partial}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" />{' '}
          {tr.calendar.full}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-rose-100 dark:bg-rose-900/40" />{' '}
          {tr.calendar.blacklisted}
        </span>
        {isLoading && <span>{tr.calendar.loading}</span>}
      </div>
    </div>
  );
}
