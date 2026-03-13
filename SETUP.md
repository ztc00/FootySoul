# FootyDubai - Quick Setup Guide

## Step-by-Step Setup

### 1. Clone and Install
```bash
cd Footsoul
npm install
```

### 2. Supabase Setup

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

#### Run Database Migrations
1. In Supabase Dashboard → SQL Editor
2. Copy and run `supabase/migrations/001_initial_schema.sql`
3. Copy and run `supabase/migrations/002_rls_policies.sql`

#### Configure Authentication
1. Go to Authentication → Providers
2. Enable "Phone" provider
3. Configure SMS provider (Twilio recommended):
   - Sign up at [twilio.com](https://twilio.com)
   - Get Account SID and Auth Token
   - Add to Supabase Phone Auth settings
4. Enable "Email" provider (optional)

#### Deploy Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_...

# Deploy functions
supabase functions deploy create-payment-intent
supabase functions deploy confirm-payment
supabase functions deploy refund-payment
```

### 3. Stripe Setup

1. Create account at [stripe.com](https://stripe.com)
2. Get your **Publishable Key** (starts with `pk_`)
3. Get your **Secret Key** (starts with `sk_`)
4. For iOS Apple Pay:
   - Go to Settings → Apple Pay
   - Create merchant identifier: `merchant.com.footydubai.app`
   - Add to your Apple Developer account

### 4. Configure Environment

Create `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Or add to `app.json`:
```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://xxxxx.supabase.co",
      "supabaseAnonKey": "eyJhbGc...",
      "stripePublishableKey": "pk_test_..."
    }
  }
}
```

### 5. Create Demo Organizer (Optional)

1. Sign up in the app with a test phone/email
2. In Supabase Dashboard → Table Editor → profiles
3. Find your user and note the `id`
4. Update role to `organizer`
5. Go to organizers table and insert:
   ```sql
   INSERT INTO organizers (profile_id, display_name)
   VALUES ('your-profile-id', 'Demo Organizer');
   ```

### 6. Run the App

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## Testing Payment Flow

1. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Use any future expiry date, any CVC, any ZIP

2. Test Apple Pay in iOS Simulator (if configured)

## Common Issues

**"Cannot find module '@expo/vector-icons'"**
```bash
npm install @expo/vector-icons
```

**"Stripe not initialized"**
- Check environment variables are set
- Restart Expo dev server

**"RLS policy violation"**
- Ensure user has a profile record
- Check RLS policies are applied

**"Edge function not found"**
- Verify functions are deployed: `supabase functions list`
- Check function names match exactly

## Next Steps

- [ ] Add error tracking (Sentry)
- [ ] Set up production Supabase project
- [ ] Configure production Stripe account
- [ ] Add App Store assets
- [ ] Test on physical devices
- [ ] Set up CI/CD pipeline

