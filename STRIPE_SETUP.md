# Stripe Setup (Payments)

Stripe is used so players pay **before** the game (App Store compliant; no in-app purchases). Follow these steps to enable real payments.

---

## 1. Create a Stripe account

1. Go to [stripe.com](https://stripe.com) and sign up.
2. Complete account verification (you can use **test mode** first).

---

## 2. Get your API keys

1. In Stripe Dashboard go to **Developers** → **API keys**.
2. You’ll see:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`) → used in the **app**.
   - **Secret key** (starts with `sk_test_` or `sk_live_`) → used only on the **server** (Supabase Edge Functions).
3. For development, use the **test** keys (toggle “Test mode” on).

---

## 3. Add keys to your project

### In the app (publishable key)

In `.env` or `.env.local`:

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxx
```

Restart Expo after changing env vars:

```bash
npx expo start --clear
```

### On the server (secret key) – Supabase Edge Functions

Your Edge Functions (`create-payment-intent`, `confirm-payment`, `refund-payment`) need the **secret** key.

If you use Supabase CLI:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
```

If you use Supabase Dashboard:

1. Go to **Project** → **Edge Functions**.
2. Open **Secrets** (or **Settings** → **Edge Function secrets**).
3. Add a secret: name `STRIPE_SECRET_KEY`, value = your Stripe **secret** key.

Redeploy the payment Edge Functions after setting the secret so they pick it up.

---

## 4. Install Supabase CLI (if you get “command not found: supabase”)

Install the CLI once, then use it from the project root.

**Option A – npm (global):**
```bash
npm install -g supabase
```

**Option B – Homebrew (macOS):**
```bash
brew install supabase/tap/supabase
```

**Option C – use npx (no install):**  
You can run the CLI without installing it by prefixing every command with `npx`:
```bash
npx supabase functions deploy create-payment-intent
```

---

## 5. Deploy Edge Functions (if not already)

From the project root. If you didn’t install the CLI, use `npx supabase` instead of `supabase`:

```bash
supabase functions deploy create-payment-intent
supabase functions deploy confirm-payment
supabase functions deploy refund-payment
```

Or with npx:
```bash
npx supabase functions deploy create-payment-intent
npx supabase functions deploy confirm-payment
npx supabase functions deploy refund-payment
```

These need `STRIPE_SECRET_KEY` set (step 3) so they can create payment intents and confirm/refund payments. You must be logged in: run `supabase login` (or `npx supabase login`) once and link the project with `supabase link` if you haven’t already.

---

## 6. (Optional) Apple Pay (iOS)

For Apple Pay in the app:

1. In Stripe Dashboard: **Settings** → **Payment methods** → **Apple Pay** and add your domain/merchant ID if required.
2. In Apple Developer: create a Merchant ID (e.g. `merchant.com.footydubai.app`) and enable it for your app.
3. The app already uses `merchantIdentifier="merchant.com.footydubai.app"` in `app.json` and the Stripe provider; once the Merchant ID exists in your Apple account, Apple Pay can work.

You can skip this and still use card payments.

---

## 7. Test payments

- Use Stripe **test** keys and [test card numbers](https://stripe.com/docs/testing#cards), e.g. `4242 4242 4242 4242`.
- In the app: open a game → **Join Game** → complete payment in the sheet. A test booking should be created and the Edge Function should confirm the payment.

---

## Summary

| Where              | Key type   | Env / location                          |
|--------------------|-----------|-----------------------------------------|
| App (`.env.local`) | Publishable | `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`   |
| Supabase secrets   | Secret     | `STRIPE_SECRET_KEY`                     |

After adding both keys and redeploying the payment Edge Functions, Stripe is the only missing piece and payments will work end-to-end.
