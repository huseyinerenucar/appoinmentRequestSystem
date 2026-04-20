import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { HttpError, apiLogin } from '../api';
import { useAuth } from '../auth/store';
import { tr } from '../i18n';

export function LoginScreen() {
  const setSession = useAuth((s) => s.setSession);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => apiLogin(username, password),
    onSuccess: (res) => {
      setSession(res.token, res.user);
    },
    onError: (err) => {
      if (err instanceof HttpError && err.status === 400) {
        setError(tr.login.required);
      } else {
        setError(tr.login.failed);
      }
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError(tr.login.required);
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-xl border bg-white p-6 shadow"
      >
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tr.app.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{tr.login.description}</p>
        </div>

        <label className="block text-sm">
          <span className="text-slate-700">{tr.login.username}</span>
          <input
            autoFocus
            autoComplete="username"
            className="mt-1 w-full rounded border px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-700">{tr.login.password}</span>
          <input
            type="password"
            autoComplete="current-password"
            className="mt-1 w-full rounded border px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <div className="rounded bg-rose-50 p-2 text-sm text-rose-800">{error}</div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white
                     hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {mutation.isPending ? tr.login.submitting : tr.login.submit}
        </button>
      </form>
    </div>
  );
}
