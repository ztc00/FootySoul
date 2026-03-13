export type UserRole = 'player' | 'organizer';

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: UserRole;
  nickname: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organizer {
  id: string;
  profile_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export type GameVisibility = 'public' | 'invite_only';

export type PitchType = '5-a-side' | '7-a-side' | '11-a-side';

export interface Game {
  id: string;
  organizer_id: string;
  title: string;
  start_time: string;
  end_time: string;
  location_name: string;
  address: string;
  map_url: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price: number;
  currency: string;
  capacity: number;
  rules: string | null;
  visibility: GameVisibility;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
  organizer?: Organizer;
  pitch_type?: PitchType | null;
  require_payment_now?: boolean | null;
  place_id?: string | null;
  image_url?: string | null;
}

export type BookingStatus = 'confirmed' | 'waitlisted' | 'cancelled';

export interface Booking {
  id: string;
  game_id: string;
  player_id: string;
  status: BookingStatus;
  spots: number;
  paid_amount: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
  game?: Game;
  player?: Profile;
}

export interface Payout {
  id: string;
  organizer_id: string;
  game_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  stripe_payout_id: string | null;
  created_at: string;
  updated_at: string;
}

