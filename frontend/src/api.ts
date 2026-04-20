import { getToken, useAuth } from './auth/store';
import type {
  ApiError,
  Appointment,
  AvailabilityResponse,
  BlacklistDate,
  CreateBookingInput,
  HierarchyNode,
  Location,
  LoginResponse,
  TestArea,
  TestCategory,
  User,
} from './types';

const BASE = '/api';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly payload: ApiError,
  ) {
    super(payload.message);
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { noAuth?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (!init?.noAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    useAuth.getState().clear();
  }
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({
      error: 'internal',
      message: res.statusText,
    }))) as ApiError;
    throw new HttpError(res.status, payload);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- auth ----
export function apiLogin(username: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    noAuth: true,
  });
}
export function apiLogout(): Promise<{ ok: true }> {
  return request('/auth/logout', { method: 'POST' });
}
export function apiMe(): Promise<{ user: User }> {
  return request('/auth/me');
}

// ---- booking flow ----
export function fetchHierarchy(): Promise<HierarchyNode[]> {
  return request<HierarchyNode[]>('/hierarchy');
}
export function fetchAvailability(
  testAreaId: number,
  start: string,
  end: string,
): Promise<AvailabilityResponse> {
  const q = new URLSearchParams({
    testAreaId: String(testAreaId),
    start,
    end,
  });
  return request<AvailabilityResponse>(`/availability?${q}`);
}
export function createBooking(
  input: CreateBookingInput,
): Promise<{ appointment: Appointment }> {
  return request('/bookings', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ---- admin ----
export const admin = {
  listLocations: () => request<Location[]>('/admin/locations'),
  createLocation: (body: { name: string; timezone: string }) =>
    request<Location>('/admin/locations', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateLocation: (id: number, body: { name: string; timezone: string }) =>
    request<Location>(`/admin/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteLocation: (id: number) =>
    request<void>(`/admin/locations/${id}`, { method: 'DELETE' }),

  listCategories: () => request<TestCategory[]>('/admin/categories'),
  createCategory: (body: { name: string; sort_order?: number }) =>
    request<TestCategory>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateCategory: (id: number, body: { name: string; sort_order?: number }) =>
    request<TestCategory>(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteCategory: (id: number) =>
    request<void>(`/admin/categories/${id}`, { method: 'DELETE' }),

  listAreas: () => request<TestArea[]>('/admin/areas'),
  createArea: (body: Omit<TestArea, 'id' | 'is_active'> & { is_active?: number }) =>
    request<TestArea>('/admin/areas', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateArea: (id: number, body: Omit<TestArea, 'id'>) =>
    request<TestArea>(`/admin/areas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteArea: (id: number) =>
    request<void>(`/admin/areas/${id}`, { method: 'DELETE' }),

  listBlacklist: () => request<BlacklistDate[]>('/admin/blacklist'),
  createBlacklist: (body: {
    test_area_id: number | null;
    location_id: number | null;
    date: string;
    reason?: string | null;
  }) =>
    request<BlacklistDate>('/admin/blacklist', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteBlacklist: (id: number) =>
    request<void>(`/admin/blacklist/${id}`, { method: 'DELETE' }),

  listUsers: () => request<User[]>('/admin/users'),
  patchUser: (id: number, body: { role?: 'admin' | 'user'; is_active?: number }) =>
    request<User>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};
