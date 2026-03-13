# How to Test the App (No Backend Needed)

## 1. Start the app

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone (same WiFi as your computer).

## 2. Demo mode (default)

If you **don’t** set Supabase/Stripe env vars, the app runs in **demo mode**:

- On the **Login** screen, tap **“Continue as Demo User”**.
- You’re taken to **Home** with 2 sample games.

## 3. What to try

1. **Home** – See “Friday Night Football” and “Weekend 5-a-side”.
2. **Open a game** – Tap a game → see details, location, price, capacity.
3. **Join a game** – Tap **“Join Game”** → confirm (no real payment) → success message.
4. **My Games** – Tab “My Games” → your booking appears.
5. **Create a game** – **Settings** → **“Become an Organizer”** → **“You are now an organizer”** → **Organizer Dashboard** → **Create Game** → fill form → **Create Game** → new game shows on Home and in Dashboard.
6. **Organizer Dashboard** – **Settings** → **Organizer Dashboard** → see your games and message templates.

## 4. Using a real backend

Add a `.env` or `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Restart Expo. The login screen will show **Phone/Email OTP** instead of **“Continue as Demo User”**. The app will use Supabase and Stripe.

## 5. Quick checklist

- [ ] Login with “Continue as Demo User”
- [ ] Home shows 2 games
- [ ] Open a game and see details
- [ ] Join game (demo payment)
- [ ] My Games shows the booking
- [ ] Settings → Become Organizer
- [ ] Organizer Dashboard → Create Game
- [ ] New game appears on Home
