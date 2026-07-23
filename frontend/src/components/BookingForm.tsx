import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { HttpError, createBooking } from '../api';
import { tr } from '../i18n';
import { useSelection } from '../store';
import type { Appointment } from '../types';

interface Props {
  areaId: number;
}

export function BookingForm({ areaId }: Props) {
  const qc = useQueryClient();
  const rangeStart = useSelection((s) => s.rangeStart);
  const rangeEnd = useSelection((s) => s.rangeEnd);
  const clearRange = useSelection((s) => s.clearRange);

  const [projectName, setProjectName] = useState('');
  const [projectOwner, setProjectOwner] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState<Appointment | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictDates, setConflictDates] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: createBooking,
    onMutate: () => {
      setSuccess(null);
      setErrorMsg(null);
      setConflictDates([]);
    },
    onSuccess: (res) => {
      setSuccess(res.appointment);
      setProjectName('');
      setProjectOwner('');
      setNotes('');
      clearRange();
      qc.invalidateQueries({ queryKey: ['availability', areaId] });
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const code = err.payload.error;
        const msg =
          code === 'conflict'
            ? tr.errors.conflict
            : code === 'blacklisted'
              ? tr.errors.blacklisted
              : code === 'validation'
                ? err.payload.message || tr.errors.validation
                : code === 'auth'
                  ? tr.errors.auth
                  : tr.errors.internal;
        setErrorMsg(msg);
        const details = err.payload.details as
          | { dates?: Array<string | { date: string }> }
          | undefined;
        const list = (details?.dates ?? []).map((d) =>
          typeof d === 'string' ? d : d.date,
        );
        setConflictDates(list);
        qc.invalidateQueries({ queryKey: ['availability', areaId] });
      } else {
        setErrorMsg(tr.errors.network);
      }
    },
  });

  const canSubmit =
    !!rangeStart &&
    !!rangeEnd &&
    projectName.trim().length > 0 &&
    !mutation.isPending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rangeStart || !rangeEnd) return;
    mutation.mutate({
      testAreaId: areaId,
      projectName: projectName.trim(),
      projectOwner: projectOwner.trim() || null,
      startDate: rangeStart,
      endDate: rangeEnd,
      notes: notes.trim() || null,
    });
  }

  const inputCls =
    'mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 ' +
    'focus:border-blue-500 focus:outline-none ' +
    'dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {tr.booking.header}
      </h3>

      <div className="text-sm text-slate-600 dark:text-slate-300">
        {rangeStart && rangeEnd ? (
          <span>
            <b>{rangeStart}</b> → <b>{rangeEnd}</b>
          </span>
        ) : (
          <span className="italic">{tr.booking.pickRange}</span>
        )}
      </div>

      <label className="block text-sm">
        <span className="text-slate-700 dark:text-slate-200">
          {tr.booking.projectName} <span className="text-rose-500">*</span>
        </span>
        <input
          className={inputCls}
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
        />
      </label>

      <label className="block text-sm">
        <span className="text-slate-700 dark:text-slate-200">
          {tr.booking.projectOwner}
        </span>
        <input
          className={inputCls}
          value={projectOwner}
          onChange={(e) => setProjectOwner(e.target.value)}
        />
      </label>

      <label className="block text-sm">
        <span className="text-slate-700 dark:text-slate-200">{tr.booking.notes}</span>
        <textarea
          className={inputCls}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white
                   hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300
                   dark:disabled:bg-slate-600"
      >
        {mutation.isPending ? tr.booking.submitting : tr.booking.submit}
      </button>

      {success && (
        <div className="rounded bg-emerald-50 p-2 text-sm text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
          {tr.booking.success(success.id)}
        </div>
      )}

      {errorMsg && (
        <div className="rounded bg-rose-50 p-2 text-sm text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
          <p>{errorMsg}</p>
          {conflictDates.length > 0 && (
            <p className="mt-1 text-xs">
              {tr.booking.affectedDates}: {conflictDates.join(', ')}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
