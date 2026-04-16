import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { HttpError, createBooking } from '../api';
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
      // Optimistic rollback: simply invalidate so next fetch is authoritative.
      qc.invalidateQueries({ queryKey: ['availability', areaId] });
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        setErrorMsg(err.payload.message);
        const details = err.payload.details as
          | { dates?: Array<string | { date: string }> }
          | undefined;
        const list = (details?.dates ?? []).map((d) =>
          typeof d === 'string' ? d : d.date,
        );
        setConflictDates(list);
        qc.invalidateQueries({ queryKey: ['availability', areaId] });
      } else {
        setErrorMsg(String(err));
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

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border bg-white p-4 shadow-sm"
    >
      <h3 className="text-base font-semibold">Book this area</h3>

      <div className="text-sm text-slate-600">
        {rangeStart && rangeEnd ? (
          <span>
            <b>{rangeStart}</b> → <b>{rangeEnd}</b>
          </span>
        ) : (
          <span className="italic">Pick a start and end date on the calendar.</span>
        )}
      </div>

      <label className="block text-sm">
        <span className="text-slate-700">Project name *</span>
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
        />
      </label>

      <label className="block text-sm">
        <span className="text-slate-700">Project owner</span>
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={projectOwner}
          onChange={(e) => setProjectOwner(e.target.value)}
        />
      </label>

      <label className="block text-sm">
        <span className="text-slate-700">Notes</span>
        <textarea
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white
                   hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {mutation.isPending ? 'Booking…' : 'Submit booking'}
      </button>

      {success && (
        <div className="rounded bg-emerald-50 p-2 text-sm text-emerald-800">
          Booking #{success.id} confirmed.
        </div>
      )}

      {errorMsg && (
        <div className="rounded bg-rose-50 p-2 text-sm text-rose-800">
          <p>{errorMsg}</p>
          {conflictDates.length > 0 && (
            <p className="mt-1 text-xs">
              Affected date(s): {conflictDates.join(', ')}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
