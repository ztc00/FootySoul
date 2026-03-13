export type PitchFilter = '5-a-side' | '7-a-side' | '11-a-side' | 'any';
export type PriceFilter = 'free' | 'under_30' | 'under_50' | 'any';
export type TimeFilter = 'morning' | 'afternoon' | 'evening' | 'any';
export type DistanceFilter = '5km' | '10km' | 'any';
/** Minimum number of free slots (1 = at least 1 spot, 2 = at least 2, etc.; 0 = any) */
export type MinFreeSlotsFilter = 0 | 1 | 2 | 3 | 5;

export interface DiscoverFiltersState {
  /** YYYY-MM-DD or null for any date */
  selectedDate: string | null;
  pitchType: PitchFilter;
  price: PriceFilter;
  time: TimeFilter;
  distance: DistanceFilter;
  /** Show only games at favorited venues */
  favoriteVenuesOnly: boolean;
  /**
   * When favoriteVenuesOnly is true:
   *   null  → show all favorite venues
   *   string → show only this specific venue (by location_name)
   */
  selectedFavoriteVenue: string | null;
  /** Minimum free slots (0 = any) */
  minFreeSlots: MinFreeSlotsFilter;
}

export const defaultDiscoverFilters: DiscoverFiltersState = {
  selectedDate: null,
  pitchType: 'any',
  price: 'any',
  time: 'any',
  distance: 'any',
  favoriteVenuesOnly: false,
  selectedFavoriteVenue: null,
  minFreeSlots: 0,
};
