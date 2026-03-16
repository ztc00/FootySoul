# Google Sign-In (Supabase OAuth)

The app uses **Supabase OAuth** for Google: the in-app browser opens Google, then Supabase redirects back to the app with tokens. These settings must match or sign-in will fail.

---

## 1. Supabase Dashboard

### Enable Google provider

1. **Authentication** → **Providers** → **Google** → turn **On**.
2. **Client ID** and **Client Secret**: use the **Web application** OAuth client from Google Cloud (see below). Save.

### Redirect URL (required)

1. **Authentication** → **URL Configuration**.
2. **Site URL:** `footysoul://` (your app scheme).
3. **Redirect URLs:** add exactly:
   - `footysoul://google-auth`

If this redirect URL is missing, the app will get “Redirect did not include sign-in tokens” after you sign in with Google.

---

## 2. Google Cloud Console

### OAuth 2.0 Web client (for Supabase)

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Create or use an **OAuth 2.0 Client ID** of type **Web application**.
3. **Authorized redirect URIs** must include:
   - `https://ddasonuwnixorbpljujm.supabase.co/auth/v1/callback`  
   (Replace `ddasonuwnixorbpljujm` with your Supabase project ref from the Supabase URL.)
4. Copy **Client ID** and **Client Secret** into Supabase → Authentication → Providers → Google.

Google sends the user back to Supabase at that callback URL; Supabase then redirects to `footysoul://google-auth` with the tokens.

---

## 3. Common issues

| Symptom | Fix |
|--------|-----|
| “Google Sign In Not Configured” | Turn on Google in Supabase → Providers and set Client ID/Secret from the **Web** OAuth client. |
| “Redirect did not include sign-in tokens” | Add `footysoul://google-auth` to Supabase → URL Configuration → Redirect URLs. |
| Google shows “redirect_uri_mismatch” | In Google Cloud, add `https://<your-project-ref>.supabase.co/auth/v1/callback` to the Web client’s Authorized redirect URIs. |
| Browser opens then closes with no error | Check Supabase Redirect URLs and that the app scheme is `footysoul` in `app.config.js`. |

---

## Summary

- **Supabase:** Google provider On; Redirect URLs include `footysoul://google-auth`; Site URL `footysoul://`.
- **Google Cloud:** Web client with redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`; use that client’s ID and secret in Supabase.
