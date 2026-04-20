/**
 * Corporate authentication adapter.
 *
 * The corporate server is authoritative for *authentication* only (is this
 * password correct?).  *Authorization* (role) is owned by the local `users`
 * table so the corporate directory does not need to know about app-specific
 * roles.
 *
 * Configure with env vars:
 *   CORPORATE_AUTH_URL      POST endpoint; receives {username,password} JSON.
 *                           Any 2xx response = credential valid.
 *   CORPORATE_AUTH_HEADERS  Optional extra headers, "Key: value" separated by
 *                           newline or ';'.
 *
 * When CORPORATE_AUTH_URL is unset a development stub is used that accepts
 * any non-empty password.  This is ONLY meant for local dev.
 */
export interface CorporateAuthResult {
  ok: boolean;
  fullName?: string;
  /** Optional free-form reason for failure (never shown to the user). */
  reason?: string;
}

function parseHeaders(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const line of raw.split(/[\n;]/)) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

async function authenticateRemote(
  url: string,
  username: string,
  password: string,
): Promise<CorporateAuthResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...parseHeaders(process.env.CORPORATE_AUTH_HEADERS),
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ username, password }),
    });
  } catch (err) {
    return { ok: false, reason: `network: ${(err as Error).message}` };
  }

  if (!res.ok) return { ok: false, reason: `status ${res.status}` };

  // Accept either plain 2xx or { ok: true, fullName/displayName/name }.
  let fullName: string | undefined;
  try {
    const body = (await res.json()) as {
      ok?: boolean;
      fullName?: string;
      displayName?: string;
      name?: string;
    };
    if (body?.ok === false) return { ok: false, reason: 'rejected by server' };
    fullName = body.fullName ?? body.displayName ?? body.name;
  } catch {
    /* response had no JSON body — that's fine, 2xx alone is enough */
  }

  return { ok: true, fullName };
}

function authenticateMock(
  username: string,
  password: string,
): CorporateAuthResult {
  if (!username.trim() || !password.trim()) {
    return { ok: false, reason: 'empty credentials' };
  }
  return { ok: true, fullName: username };
}

export async function authenticateCorporate(
  username: string,
  password: string,
): Promise<CorporateAuthResult> {
  const url = process.env.CORPORATE_AUTH_URL?.trim();
  if (!url) return authenticateMock(username, password);
  return authenticateRemote(url, username, password);
}
