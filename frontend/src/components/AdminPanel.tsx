import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { HttpError, admin } from '../api';
import { tr } from '../i18n';
import type { BlacklistDate, TestArea, TestCategory, User } from '../types';

type Tab = 'categories' | 'areas' | 'blacklist' | 'users';

const inputCls =
  'rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 ' +
  'focus:border-blue-500 focus:outline-none ' +
  'dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>('areas');
  const t = tr.admin;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm
                        dark:border-slate-700 dark:bg-slate-800">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {t.header}
        </h2>
        <nav className="flex gap-1 rounded-md bg-slate-100 p-1 text-sm dark:bg-slate-900">
          {(Object.keys(t.tabs) as Tab[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded px-3 py-1 ${
                tab === k
                  ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {t.tabs[k]}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'categories' && <Categories />}
      {tab === 'areas' && <Areas />}
      {tab === 'blacklist' && <Blacklist />}
      {tab === 'users' && <Users />}
    </section>
  );
}

function useErrorFlash() {
  const [msg, setMsg] = useState<string | null>(null);
  const from = (err: unknown) => {
    if (err instanceof HttpError) setMsg(err.payload.message);
    else setMsg(String(err));
  };
  return { msg, from, clear: () => setMsg(null) };
}

function FlashError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="mb-2 rounded bg-rose-50 p-2 text-sm text-rose-800
                    dark:bg-rose-900/40 dark:text-rose-200">
      {msg}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>
  );
}

// --------- Categories ---------
function Categories() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: admin.listCategories,
  });
  const [name, setName] = useState('');
  const [sort, setSort] = useState(0);
  const flash = useErrorFlash();

  const create = useMutation({
    mutationFn: () => admin.createCategory({ name, sort_order: sort }),
    onSuccess: () => {
      setName('');
      setSort(0);
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      qc.invalidateQueries({ queryKey: ['hierarchy'] });
    },
    onError: flash.from,
  });
  const update = useMutation({
    mutationFn: (c: TestCategory) =>
      admin.updateCategory(c.id, { name: c.name, sort_order: c.sort_order }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      qc.invalidateQueries({ queryKey: ['hierarchy'] });
    },
    onError: flash.from,
  });
  const remove = useMutation({
    mutationFn: (id: number) => admin.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      qc.invalidateQueries({ queryKey: ['hierarchy'] });
    },
    onError: flash.from,
  });

  return (
    <div>
      <FlashError msg={flash.msg} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          flash.clear();
          if (name.trim()) create.mutate();
        }}
        className="mb-3 flex flex-wrap gap-2"
      >
        <input
          placeholder={tr.admin.common.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputCls} min-w-[160px] flex-1`}
        />
        <input
          type="number"
          placeholder={tr.admin.common.sortOrder}
          value={sort}
          onChange={(e) => setSort(Number(e.target.value))}
          className={`${inputCls} w-24`}
        />
        <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
          {tr.admin.common.add}
        </button>
      </form>
      {isLoading ? (
        <Muted>{tr.app.loading}</Muted>
      ) : data.length === 0 ? (
        <Muted>{tr.admin.common.empty}</Muted>
      ) : (
        <EditableTable
          headers={[tr.admin.common.name, tr.admin.common.sortOrder, tr.admin.common.actions]}
          rows={data.map((c) => ({
            key: c.id,
            cells: [
              <InlineText
                key="n"
                value={c.name}
                onSave={(v) => update.mutate({ ...c, name: v })}
              />,
              <InlineNumber
                key="s"
                value={c.sort_order}
                onSave={(v) => update.mutate({ ...c, sort_order: v })}
              />,
              <RowActions key="a" onDelete={() => remove.mutate(c.id)} />,
            ],
          }))}
        />
      )}
    </div>
  );
}

// --------- Areas ---------
function Areas() {
  const qc = useQueryClient();
  const areasQ = useQuery({ queryKey: ['admin', 'areas'], queryFn: admin.listAreas });
  const catsQ = useQuery({ queryKey: ['admin', 'categories'], queryFn: admin.listCategories });
  const flash = useErrorFlash();

  const [form, setForm] = useState({
    name: '',
    category_id: 0,
    daily_capacity: 1,
    min_days: 1,
    max_days: 7,
  });

  const create = useMutation({
    mutationFn: () => admin.createArea({ ...form, is_active: 1 }),
    onSuccess: () => {
      setForm({ ...form, name: '' });
      qc.invalidateQueries({ queryKey: ['admin', 'areas'] });
      qc.invalidateQueries({ queryKey: ['hierarchy'] });
    },
    onError: flash.from,
  });

  const update = useMutation({
    mutationFn: (a: TestArea) =>
      admin.updateArea(a.id, {
        category_id: a.category_id,
        name: a.name,
        daily_capacity: a.daily_capacity,
        min_days: a.min_days,
        max_days: a.max_days,
        is_active: a.is_active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'areas'] });
      qc.invalidateQueries({ queryKey: ['hierarchy'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: flash.from,
  });

  const remove = useMutation({
    mutationFn: (id: number) => admin.deleteArea(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'areas'] });
      qc.invalidateQueries({ queryKey: ['hierarchy'] });
    },
    onError: flash.from,
  });

  const areas = areasQ.data ?? [];
  const cats = catsQ.data ?? [];
  const catName = (id: number) => cats.find((c) => c.id === id)?.name ?? '—';

  return (
    <div>
      <FlashError msg={flash.msg} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          flash.clear();
          if (form.name.trim() && form.category_id) create.mutate();
        }}
        className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-6"
      >
        <input
          placeholder={tr.admin.common.name}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={`${inputCls} col-span-2`}
        />
        <select
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
          className={inputCls}
        >
          <option value={0}>{tr.admin.common.category}</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={form.daily_capacity}
          onChange={(e) => setForm({ ...form, daily_capacity: Number(e.target.value) })}
          className={inputCls}
          title={tr.admin.common.dailyCapacity}
        />
        <div className="flex gap-1">
          <input
            type="number"
            min={1}
            value={form.min_days}
            onChange={(e) => setForm({ ...form, min_days: Number(e.target.value) })}
            className={`${inputCls} w-full`}
            title={tr.admin.common.minDays}
          />
          <input
            type="number"
            min={1}
            value={form.max_days}
            onChange={(e) => setForm({ ...form, max_days: Number(e.target.value) })}
            className={`${inputCls} w-full`}
            title={tr.admin.common.maxDays}
          />
        </div>
        <button className="col-span-2 rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 md:col-span-6">
          {tr.admin.common.add}
        </button>
      </form>

      {areasQ.isLoading ? (
        <Muted>{tr.app.loading}</Muted>
      ) : areas.length === 0 ? (
        <Muted>{tr.admin.common.empty}</Muted>
      ) : (
        <EditableTable
          headers={[
            tr.admin.common.name,
            tr.admin.common.category,
            tr.admin.common.dailyCapacity,
            tr.admin.common.minDays,
            tr.admin.common.maxDays,
            tr.admin.common.status,
            tr.admin.common.actions,
          ]}
          rows={areas.map((a) => ({
            key: a.id,
            cells: [
              <InlineText
                key="n"
                value={a.name}
                onSave={(v) => update.mutate({ ...a, name: v })}
              />,
              <span key="c" className="text-slate-800 dark:text-slate-200">
                {catName(a.category_id)}
              </span>,
              <InlineNumber
                key="cap"
                value={a.daily_capacity}
                min={1}
                onSave={(v) => update.mutate({ ...a, daily_capacity: v })}
              />,
              <InlineNumber
                key="mn"
                value={a.min_days}
                min={1}
                onSave={(v) => update.mutate({ ...a, min_days: v })}
              />,
              <InlineNumber
                key="mx"
                value={a.max_days}
                min={1}
                onSave={(v) => update.mutate({ ...a, max_days: v })}
              />,
              <button
                key="st"
                type="button"
                onClick={() =>
                  update.mutate({ ...a, is_active: a.is_active ? 0 : 1 })
                }
                className={`rounded px-2 py-0.5 text-xs ${
                  a.is_active
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {a.is_active ? tr.admin.common.active : tr.admin.common.inactive}
              </button>,
              <RowActions key="a" onDelete={() => remove.mutate(a.id)} />,
            ],
          }))}
        />
      )}
    </div>
  );
}

// --------- Blacklist ---------
function Blacklist() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ['admin', 'blacklist'], queryFn: admin.listBlacklist });
  const areasQ = useQuery({ queryKey: ['admin', 'areas'], queryFn: admin.listAreas });
  const flash = useErrorFlash();

  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [scope, setScope] = useState<string>('global');

  function parseScope(): { test_area_id: number | null } {
    if (scope === 'global') return { test_area_id: null };
    if (scope.startsWith('area:'))
      return { test_area_id: Number(scope.slice(5)) };
    return { test_area_id: null };
  }

  const create = useMutation({
    mutationFn: () =>
      admin.createBlacklist({
        ...parseScope(),
        date,
        reason: reason || null,
      }),
    onSuccess: () => {
      setDate('');
      setReason('');
      qc.invalidateQueries({ queryKey: ['admin', 'blacklist'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: flash.from,
  });
  const remove = useMutation({
    mutationFn: (id: number) => admin.deleteBlacklist(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'blacklist'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: flash.from,
  });

  function scopeLabel(b: BlacklistDate): string {
    if (b.test_area_id) {
      const a = areasQ.data?.find((x) => x.id === b.test_area_id);
      return a ? `${tr.admin.tabs.areas}: ${a.name}` : `area#${b.test_area_id}`;
    }
    return tr.admin.common.all;
  }

  return (
    <div>
      <FlashError msg={flash.msg} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          flash.clear();
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) create.mutate();
        }}
        className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4"
      >
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputCls}
        />
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className={inputCls}
        >
          <option value="global">{tr.admin.common.all}</option>
          <optgroup label={tr.admin.tabs.areas}>
            {areasQ.data?.map((a) => (
              <option key={`area-${a.id}`} value={`area:${a.id}`}>
                {a.name}
              </option>
            ))}
          </optgroup>
        </select>
        <input
          placeholder={tr.admin.common.reason}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={inputCls}
        />
        <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
          {tr.admin.common.add}
        </button>
      </form>

      {listQ.isLoading ? (
        <Muted>{tr.app.loading}</Muted>
      ) : (listQ.data?.length ?? 0) === 0 ? (
        <Muted>{tr.admin.common.empty}</Muted>
      ) : (
        <EditableTable
          headers={[
            tr.admin.common.date,
            tr.admin.common.scope,
            tr.admin.common.reason,
            tr.admin.common.actions,
          ]}
          rows={listQ.data!.map((b) => ({
            key: b.id,
            cells: [
              <span key="d" className="text-slate-800 dark:text-slate-200">
                {b.date}
              </span>,
              <span key="s" className="text-slate-800 dark:text-slate-200">
                {scopeLabel(b)}
              </span>,
              <span key="r" className="text-slate-800 dark:text-slate-200">
                {b.reason ?? '—'}
              </span>,
              <RowActions key="a" onDelete={() => remove.mutate(b.id)} />,
            ],
          }))}
        />
      )}
    </div>
  );
}

// --------- Users ---------
function Users() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: admin.listUsers,
  });
  const flash = useErrorFlash();

  const patch = useMutation({
    mutationFn: (payload: { id: number; role?: 'admin' | 'user'; is_active?: number }) =>
      admin.patchUser(payload.id, { role: payload.role, is_active: payload.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: flash.from,
  });

  return (
    <div>
      <FlashError msg={flash.msg} />
      {isLoading ? (
        <Muted>{tr.app.loading}</Muted>
      ) : data.length === 0 ? (
        <Muted>{tr.admin.common.empty}</Muted>
      ) : (
        <EditableTable
          headers={[
            tr.admin.common.username,
            tr.admin.common.fullName,
            tr.admin.common.role,
            tr.admin.common.status,
            tr.admin.common.lastLogin,
          ]}
          rows={data.map((u: User) => ({
            key: u.id,
            cells: [
              <span key="u" className="text-slate-800 dark:text-slate-200">
                {u.username}
              </span>,
              <span key="n" className="text-slate-800 dark:text-slate-200">
                {u.full_name ?? '—'}
              </span>,
              <select
                key="r"
                value={u.role}
                onChange={(e) =>
                  patch.mutate({ id: u.id, role: e.target.value as 'admin' | 'user' })
                }
                className={`${inputCls} px-2 py-0.5 text-xs`}
              >
                <option value="user">{tr.app.role.user}</option>
                <option value="admin">{tr.app.role.admin}</option>
              </select>,
              <button
                key="s"
                type="button"
                onClick={() => patch.mutate({ id: u.id, is_active: u.is_active ? 0 : 1 })}
                className={`rounded px-2 py-0.5 text-xs ${
                  u.is_active
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {u.is_active ? tr.admin.common.active : tr.admin.common.inactive}
              </button>,
              <span key="l" className="text-slate-500 dark:text-slate-400">
                {u.last_login_at
                  ? new Date(u.last_login_at).toLocaleString('tr-TR')
                  : tr.admin.common.never}
              </span>,
            ],
          }))}
        />
      )}
    </div>
  );
}

// --------- shared bits ---------
interface Row {
  key: number | string;
  cells: React.ReactNode[];
}

function EditableTable({ headers, rows }: { headers: string[]; rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500
                         dark:border-slate-700 dark:text-slate-400">
            {headers.map((h) => (
              <th key={h} className="py-2 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              className="border-b border-slate-100 last:border-0 dark:border-slate-700/60"
            >
              {r.cells.map((c, i) => (
                <td key={i} className="py-1.5 pr-3 align-middle">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineText({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      className={`${inputCls} w-full px-1 py-0.5`}
    />
  );
}

function InlineNumber({
  value,
  onSave,
  min = 0,
}: {
  value: number;
  onSave: (v: number) => void;
  min?: number;
}) {
  const [v, setV] = useState(value);
  return (
    <input
      type="number"
      min={min}
      value={v}
      onChange={(e) => setV(Number(e.target.value))}
      onBlur={() => v !== value && onSave(v)}
      className={`${inputCls} w-20 px-1 py-0.5`}
    />
  );
}

function RowActions({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm(tr.admin.common.confirmDelete)) onDelete();
      }}
      className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-100
                 dark:bg-rose-900/40 dark:text-rose-200 dark:hover:bg-rose-900/60"
    >
      {tr.admin.common.delete}
    </button>
  );
}
