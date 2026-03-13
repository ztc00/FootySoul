# FootyDubai Architecture

## System Overview

FootyDubai is a React Native mobile app built with Expo that connects football game organizers with players in Dubai. The app handles game creation, payment processing, booking management, and communication.

## Technology Stack

### Frontend
- **Framework**: React Native with Expo (~51.0)
- **Language**: TypeScript (strict mode)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Query (TanStack Query) for server state
- **UI Components**: React Native core + Expo Vector Icons
- **Forms**: React Hook Form (for future form validation)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Phone OTP + Email)
- **API**: Supabase Edge Functions (Deno runtime)
- **Payments**: Stripe Payment Sheet
- **Notifications**: Expo Push Notifications

## Data Flow

### Authentication Flow
```
User → Login Screen → Supabase Auth (OTP) → Profile Created → Home Screen
```

### Create Game Flow
```
Organizer → Create Game Form → Supabase (games table) → Dashboard
```

### Join Game Flow
```
Player → Game Details → Stripe Payment Sheet → Edge Function (confirm-payment) → Booking Created → Success
```

### Payment Flow (Detailed)
1. User taps "Join Game"
2. Client calls `create-payment-intent` edge function
3. Edge function:
   - Validates game capacity
   - Checks for existing booking
   - Creates Stripe Payment Intent
   - Returns client secret
4. Client presents Stripe Payment Sheet
5. User completes payment
6. Client calls `confirm-payment` edge function
7. Edge function:
   - Retrieves payment intent from Stripe
   - Validates payment succeeded
   - Creates booking atomically
   - Sets status (confirmed/waitlisted) based on capacity
8. Client shows success message

## Database Schema

### Tables

#### `profiles`
- Extends Supabase `auth.users`
- Stores user profile data
- Links to `organizers` if user is an organizer

#### `organizers`
- One-to-one with `profiles`
- Stores organizer-specific data (display_name)

#### `games`
- Created by organizers
- Contains game details (time, location, price, capacity)
- Has `invite_code` for private games

#### `bookings`
- Links players to games
- Stores payment info (Stripe payment intent ID)
- Status: `confirmed`, `waitlisted`, `cancelled`
- Unique constraint on (game_id, player_id) prevents double booking

#### `payouts`
- Placeholder for organizer earnings
- Future: Track Stripe payouts to organizers

### Row Level Security (RLS)

All tables have RLS enabled with policies:

- **Profiles**: Users can only read/update their own profile
- **Games**: 
  - Public games: Anyone can read
  - Invite-only games: Only organizers and players with bookings
  - Organizers can CRUD their own games
- **Bookings**:
  - Players can read/update their own bookings
  - Organizers can read/update bookings for their games
- **Payouts**: Organizers can only read their own payouts

## Security Considerations

1. **Payment Validation**: All payment operations go through edge functions that validate:
   - User authentication
   - Game capacity
   - Ownership/authorization
   - Payment status

2. **Double Booking Prevention**:
   - Unique constraint in database
   - Capacity check in edge function
   - Atomic booking creation

3. **Data Access**: RLS policies ensure users can only access authorized data

4. **API Keys**: Stripe secret key stored as Supabase secret (not exposed to client)

## Edge Functions

### `create-payment-intent`
- Validates game and user
- Checks capacity
- Creates Stripe Payment Intent
- Returns client secret

### `confirm-payment`
- Retrieves payment intent from Stripe
- Validates payment succeeded
- Creates booking atomically
- Handles race conditions

### `refund-payment`
- Validates authorization (player or organizer)
- Processes Stripe refund
- Updates booking status

## State Management

- **Server State**: React Query
  - Automatic caching
  - Background refetching
  - Optimistic updates
- **Local State**: React useState/useReducer
- **Auth State**: Context API (AuthProvider)

## Deep Linking

Format: `footydubai://game/{game_id}?code={invite_code}`

Handled by Expo Linking:
- Opens app if installed
- Navigates to game details screen
- Validates invite code (if private game)

## Notifications

- Expo Push Notifications
- Token stored in user profile
- Can be triggered by:
  - Organizer (reminders)
  - System (game updates)
  - Edge functions (payment confirmations)

## Error Handling

- Try-catch blocks in async functions
- User-friendly error messages
- Error boundaries (future enhancement)
- Logging to console (production: Sentry)

## Performance Optimizations

- React Query caching reduces API calls
- Database indexes on frequently queried columns
- Lazy loading of game details
- Image optimization (future: Expo Image)

## Scalability Considerations

### Current MVP
- Single Supabase project
- Edge functions handle all server logic
- Direct database queries from client (with RLS)

### Future Enhancements
- API rate limiting
- Caching layer (Redis)
- CDN for static assets
- Background jobs for notifications
- Analytics and monitoring

## Testing Strategy

### Unit Tests (Future)
- React Query hooks
- Utility functions
- Edge functions

### Integration Tests (Future)
- Payment flow
- Booking creation
- Auth flow

### E2E Tests (Future)
- Complete user journeys
- Payment scenarios
- Error cases

## Deployment

### Development
- Expo Go app
- Local Supabase project
- Stripe test mode

### Production
- EAS Build (Expo Application Services)
- Production Supabase project
- Stripe live mode
- App Store / Play Store

## Future Extensions

### Pitch Supply Marketplace
1. Add `pitches` table
2. Link games to pitches
3. Pitch booking system
4. Revenue sharing between organizers and pitch owners

### Social Features
- Player profiles
- Ratings/reviews
- Game history
- Statistics

### Advanced Features
- Recurring games
- Team formation
- Live game updates
- In-app chat

