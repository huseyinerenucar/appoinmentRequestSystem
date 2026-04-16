import type {
  ApiError,
  Appointment,
  AvailabilityResponse,
  CreateBookingInput,
  HierarchyNode,
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({
      error: 'internal',
      message: res.statusText,
    }))) as ApiError;
    throw new HttpError(res.status, payload);
  }
  return res.json() as Promise<T>;
}

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
