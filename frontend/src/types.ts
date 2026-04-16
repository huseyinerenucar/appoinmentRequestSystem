export interface Location {
  id: number;
  name: string;
  timezone: string;
}

export interface TestCategory {
  id: number;
  name: string;
  sort_order: number;
}

export interface TestArea {
  id: number;
  category_id: number;
  location_id: number;
  name: string;
  daily_capacity: number;
  min_days: number;
  max_days: number;
  is_active: number;
}

export interface HierarchyNode {
  location: Location;
  categories: {
    category: TestCategory;
    areas: TestArea[];
  }[];
}

export interface DayAvailability {
  date: string;
  capacity: number;
  booked: number;
  available: number;
  blacklisted: boolean;
}

export interface AvailabilityResponse {
  area: TestArea;
  days: DayAvailability[];
}

export interface Appointment {
  id: number;
  test_area_id: number;
  project_id: number;
  start_date: string;
  end_date: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string | null;
  created_at: number;
}

export interface CreateBookingInput {
  testAreaId: number;
  projectName: string;
  projectOwner?: string | null;
  startDate: string;
  endDate: string;
  notes?: string | null;
}

export interface ApiError {
  error: 'conflict' | 'blacklisted' | 'validation' | 'internal' | 'not_found';
  message: string;
  details?: unknown;
}
