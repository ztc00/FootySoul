# FootyDubai - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables

Create `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=your_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key
```

### 3. Set Up Supabase (One-Time)

1. Create project at [supabase.com](https://supabase.com)
2. Run SQL migrations:
   - Copy `supabase/migrations/001_initial_schema.sql` → SQL Editor → Run
   - Copy `supabase/migrations/002_rls_policies.sql` → SQL Editor → Run
3. Enable Phone Auth in Authentication → Providers
4. Deploy edge functions (see SETUP.md)

### 4. Set Up Stripe (One-Time)

1. Create account at [stripe.com](https://stripe.com)
2. Get test keys from Dashboard
3. Add publishable key to `.env`

### 5. Run the App

```bash
npm start
```

Press `i` for iOS or `a` for Android.

## ✅ What's Included

- ✅ Full authentication (Phone OTP + Email)
- ✅ Game creation for organizers
- ✅ Game browsing for players
- ✅ Stripe payment integration
- ✅ Booking and waitlist system
- ✅ Organizer dashboard
- ✅ Message templates
- ✅ Deep linking
- ✅ Push notifications setup

## 🧪 Test Payment

Use Stripe test card: `4242 4242 4242 4242`
- Any future expiry
- Any CVC
- Any ZIP

## 📚 Next Steps

- Read [README.md](README.md) for full documentation
- Read [SETUP.md](SETUP.md) for detailed setup
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design

## 🐛 Troubleshooting

**"Module not found"**
→ Run `npm install` again

**"Supabase error"**
→ Check environment variables are set correctly

**"Stripe not working"**
→ Verify Stripe keys are correct (test mode)

**"RLS policy error"**
→ Ensure migrations are run and user has profile

