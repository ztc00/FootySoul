# FootyDubai - Mobile App MVP

A production-ready React Native mobile app that replaces WhatsApp logistics for football pickup game organizers in Dubai. Built with Expo, TypeScript, Supabase, and Stripe.

## 🎯 Overview

FootyDubai helps WhatsApp group admins run football games with less messaging by providing:
- Game session creation with time/location/price/capacity
- Pre-game payment collection (Apple-friendly flow via Stripe)
- Auto-confirmation, waitlist management, and reminders
- Shareable invite links and message templates to reduce WhatsApp spam

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native + Expo (~51.0) with TypeScript
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Payments**: Stripe Payment Sheet with Apple Pay support
- **State Management**: React Query (TanStack Query)
- **Notifications**: Expo Push Notifications
- **Deep Linking**: Expo Linking

### Project Structure
```
Footsoul/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main tab navigation
│   ├── game/[id].tsx      # Game details screen
│   ├── create-game.tsx    # Create game screen
│   └── organizer-dashboard.tsx
├── src/
│   ├── lib/               # Core utilities
│   │   ├── supabase.ts   # Supabase client
│   │   ├── auth.tsx      # Auth context/provider
│   │   ├── stripe.ts     # Stripe integration
│   │   ├── linking.ts    # Deep linking setup
│   │   ├── notifications.ts
│   │   └── i18n.ts       # i18n scaffolding
│   ├── hooks/             # React Query hooks
│   │   └── useGames.ts
│   └── types/             # TypeScript types
│       └── database.ts
├── supabase/
│   ├── migrations/        # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_seed_demo_organizer.sql
│   └── functions/         # Edge Functions
│       ├── create-payment-intent/
│       ├── confirm-payment/
│       └── refund-payment/
└── package.json
```

## 🗄️ Database Schema

### Tables
- **profiles**: User profiles (extends Supabase auth.users)
- **organizers**: Organizer-specific data
- **games**: Game sessions with details
- **bookings**: Player bookings with payment info
- **payouts**: Organizer earnings (placeholder for future)

### Key Features
- Row Level Security (RLS) policies for data access control
- Unique constraint on (game_id, player_id) to prevent double booking
- Automatic capacity tracking via database functions
- Invite codes for private games

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- Stripe account
- iOS Simulator / Android Emulator or physical device

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

Or configure in `app.json` under `extra`:
```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "your_supabase_url",
      "supabaseAnonKey": "your_supabase_anon_key",
      "stripePublishableKey": "your_stripe_publishable_key"
    }
  }
}
```

### 3. Supabase Setup

#### Run Migrations
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed_demo_organizer.sql` (optional, for dev)

#### Configure Auth
1. Enable Phone Auth in Supabase Dashboard → Authentication → Providers
2. Configure SMS provider (Twilio recommended for production)
3. Enable Email Auth if using email OTP

#### Deploy Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy create-payment-intent
supabase functions deploy confirm-payment
supabase functions deploy refund-payment
```

#### Set Edge Function Secrets
```bash
supabase secrets set STRIPE_SECRET_KEY=your_stripe_secret_key
```

### 4. Stripe Setup

1. Create a Stripe account
2. Get your Publishable Key (for client) and Secret Key (for edge functions)
3. Configure Apple Pay in Stripe Dashboard (for iOS)
4. Set up webhook endpoints (optional, for production):
   - `payment_intent.succeeded` → Update booking status
   - `payment_intent.payment_failed` → Handle failures

### 5. Run the App

```bash
# Start Expo dev server
npm start

# Or run on specific platform
npm run ios
npm run android
```

## 📱 Key Flows

### Authentication Flow
1. User enters phone/email
2. OTP sent via Supabase Auth
3. User verifies OTP
4. Profile created/updated in `profiles` table
5. User redirected to home screen

### Create Game Flow (Organizer)
1. Organizer taps "Create Game" (from dashboard or settings)
2. Fills form: title, location, date/time, price, capacity, rules
3. Chooses visibility (public vs invite-only)
4. Game created in database with invite code (if private)
5. Organizer can share invite link or use message templates

### Join Game Flow (Player)
1. Player views game details
2. Taps "Join Game"
3. Payment Sheet opens (Stripe)
4. Player completes payment (Apple Pay or card)
5. Edge function creates booking:
   - Checks capacity
   - Creates booking record
   - Sets status: `confirmed` or `waitlisted`
6. Player sees confirmation

### Payment Flow
1. Client calls `create-payment-intent` edge function
2. Function validates game capacity and user
3. Stripe Payment Intent created
4. Client presents Payment Sheet
5. On success, client calls `confirm-payment` edge function
6. Function creates booking atomically (prevents double booking)

### Refund Flow
1. Organizer cancels game OR removes player
2. Calls `refund-payment` edge function
3. Function validates authorization
4. Stripe refund processed
5. Booking status updated to `cancelled`

## 🔐 Security Features

- **Row Level Security (RLS)**: All tables protected by policies
- **Payment Validation**: Edge functions validate capacity and ownership
- **Double Booking Prevention**: Unique constraint + atomic operations
- **Authorization Checks**: Players can only manage their bookings; organizers can manage their games

## 🌐 Deep Linking

Invite links format: `footydubai://game/{game_id}?code={invite_code}`

Deep links are handled automatically via Expo Linking. When a user opens an invite link:
1. App opens (if installed) or redirects to App Store
2. Game details screen loads
3. If invite-only, code is validated

## 📲 Push Notifications

- Expo Push Notifications configured
- Token stored in user profile
- Reminders can be scheduled (1 hour before game)
- Organizer can trigger reminders from dashboard

## 🎨 UI/UX

- Clean, modern light-mode design
- Fast flows (create game < 60 seconds)
- Empty states and loading indicators
- Error handling with user-friendly messages
- Arabic/English i18n scaffolding (ready for full translation)

## 🚢 App Store Readiness Checklist

### iOS
- [x] Bundle identifier configured (`com.footydubai.app`)
- [x] Location permissions configured
- [x] Notification permissions configured
- [x] Deep linking scheme configured (`footydubai://`)
- [ ] Privacy policy URL (add to Settings screen)
- [ ] Terms of service URL (add to Settings screen)
- [ ] App Store screenshots and metadata
- [ ] TestFlight beta testing
- [ ] Stripe Apple Pay merchant ID configured

### Android
- [x] Package name configured (`com.footydubai.app`)
- [x] Permissions configured
- [x] Deep linking configured
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Play Store listing assets
- [ ] Internal testing track setup

### General
- [ ] Error tracking (Sentry, Bugsnag, etc.)
- [ ] Analytics (Mixpanel, Amplitude, etc.)
- [ ] Production Supabase project
- [ ] Production Stripe account
- [ ] SSL certificates for deep links (if using https://)

## 🔄 Extending to Pitch Supply Marketplace

The architecture is designed to easily extend to a pitch supply marketplace:

1. **Add `pitches` table**: Store pitch/venue information
2. **Link games to pitches**: Add `pitch_id` to games table
3. **Pitch booking system**: Similar to game bookings
4. **Organizer → Pitch Owner**: Add role or separate table
5. **Revenue sharing**: Extend payouts table for pitch owners

The existing payment and booking infrastructure can be reused with minimal changes.

## 🐛 Troubleshooting

### Common Issues

**"Missing Supabase environment variables"**
- Ensure `.env` file exists or `app.json` has `extra` config
- Restart Expo dev server after adding env vars

**"Stripe Payment Sheet not showing"**
- Check Stripe keys are correct
- Ensure `initializeStripe` is called in root layout
- Check device has internet connection

**"RLS policy violation"**
- Verify user is authenticated
- Check profile exists in `profiles` table
- Review RLS policies in migration file

**"Deep links not working"**
- Test with `expo start --dev-client` for development
- Ensure scheme matches `app.json` configuration
- Check device settings allow app to open links

## 📝 Development Notes

- Uses React Query for server state management
- TypeScript strict mode enabled
- ESLint configured for code quality
- Database migrations are idempotent (safe to run multiple times)

## 📄 License

Private - All rights reserved

## 👥 Support

For issues or questions:
- Email: support@footydubai.com
- Check Supabase logs for edge function errors
- Check Stripe Dashboard for payment issues

---

Built with ❤️ for Dubai's football community

