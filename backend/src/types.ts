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

export interface Project {
  id: number;
  name: string;
  owner: string | null;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Appointment {
  id: number;
  test_area_id: number;
  project_id: number;
  start_date: string;
  end_date: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: number;
}

export interface BlacklistDate {
  id: number;
  test_area_id: number | null;
  location_id: number | null;
  date: string;
  reason: string | null;
}

export interface DayAvailability {
  date: string;        // YYYY-MM-DD
  capacity: number;    // daily_capacity of the area
  booked: number;      // confirmed bookings that day
  available: number;   // capacity - booked (>= 0)
  blacklisted: boolean;
}

export interface HierarchyNode {
  location: Location;
  categories: {
    category: TestCategory;
    areas: TestArea[];
  }[];
}
