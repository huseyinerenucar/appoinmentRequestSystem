import { create } from 'zustand';

export interface SelectionState {
  areaId: number | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  setArea: (id: number | null) => void;
  setRange: (start: string | null, end: string | null) => void;
  clearRange: () => void;
}

export const useSelection = create<SelectionState>((set) => ({
  areaId: null,
  rangeStart: null,
  rangeEnd: null,
  setArea: (id) => set({ areaId: id, rangeStart: null, rangeEnd: null }),
  setRange: (rangeStart, rangeEnd) => set({ rangeStart, rangeEnd }),
  clearRange: () => set({ rangeStart: null, rangeEnd: null }),
}));
