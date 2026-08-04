import { useStore } from 'zustand';
import { trip } from '@/data';
import { createTripStore, type TripState } from '@/lib/store';

/** La única instancia del estado central (§3). La isla `<App>` la consume. */
export const tripStore = createTripStore(trip);

export function useTripStore<T>(selector: (state: TripState) => T): T {
  return useStore(tripStore, selector);
}
