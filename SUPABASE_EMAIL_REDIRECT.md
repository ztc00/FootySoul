# Supabase: Site URL, Redirect URL, and Email OTP

## "Email rate limit exceeded"

Supabase limits how many auth emails (OTP / confirm) can be sent in a short time. If you see this:

- **Wait about 1 hour** before requesting another OTP from the app.
- **Use Demo User meanwhile:** On the login screen, tap **"Continue as Demo User"** to use the app without email.
- **Reduce future triggers:** In Supabase → **Authentication** → **Providers** → **Email**, turn **off** "Confirm email" while testing so one OTP signs you in and you need fewer emails.

---

## Site URL (you don’t have a website)

Supabase asks for a **Site URL**. For a mobile-only app you don’t need a real website.

Use your app’s scheme as the “site”:

- **Site URL:** `footydubai://`

Do **not** use `google.com` or another random site. That would break redirects and can be a security issue.

In **Supabase Dashboard** → **Authentication** → **URL Configuration** set:

- **Site URL:** `footydubai://`
- **Redirect URLs:** add `footydubai://auth/confirm` (and keep it in the list)

Save. The confirmation link in the email will then use your app scheme instead of localhost.

---

## Didn’t get a 6-digit OTP in the email

Supabase can send either a **magic link** or a **one-time code** (OTP). By default the “Confirm signup” email often only has the link; the 6-digit code might not be in the template.

### 1. Check spam / promotions

Look in Spam, Junk, and Promotions. Supabase emails sometimes land there.

### 2. Use the link on the same device as the app

If the email only has a “Confirm your email” link:

- On **phone:** tap the link. With Site URL and Redirect URL set to `footydubai://` and `footydubai://auth/confirm`, it should try to open your app (or you may get a “Open in app?” prompt).
- On **computer:** open the link in the browser; you’ll get a “Redirecting…”-style page. That still confirms the email. Then in the **app** try **Send OTP** again and **Verify OTP** with the **new** code from the second email (if Supabase sends a code the next time).

So: confirm once with the link if needed, then use the app with a new OTP if a code appears in a later email.

### 3. Show the 6-digit code in the email (recommended)

So the app’s “enter 6-digit code” flow works, put the code in the email:

1. **Supabase Dashboard** → **Authentication** → **Email Templates**.
2. Open **“Confirm signup”**.
3. In the body you’ll see things like `{{ .ConfirmationURL }}`. Add the token so the user can copy the code, e.g.:

   **Subject:** keep as is (e.g. “Confirm Your Signup”).

   **Body** (concept – your template may look different):

   ```html
   <h2>Confirm your signup</h2>
   <p>Your one-time code is: <strong>{{ .Token }}</strong></p>
   <p>Enter this 6-digit code in the FootyDubai app.</p>
   <p>Or click: <a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
   ```

   Use the exact variable names your template shows (e.g. `{{ .Token }}` or `{{ .TokenHash }}`). Save.

After that, new signups should get an email that contains both the link and the 6-digit code.

**Why the email still looks the same:** (1) You're reading an **old** email – trigger a **new** one by tapping Send OTP again in the app and check the latest email. (2) Did you click **Save** at the bottom of the template? (3) Edit **Confirm signup** only (not Magic Link). (4) Use exactly `{{ .Token }}` for the 6-digit code. **Quick test:** Change the email **subject** to e.g. "FootyDubai code", Save, then send a new OTP – if the new email has the new subject, the template is working.

### 4. (Optional) Ease testing: disable “Confirm email”

If you only want to test and don’t care about confirming email yet:

1. **Supabase Dashboard** → **Authentication** → **Providers** → **Email**.
2. Turn **off** “Confirm email”.

Then the first OTP you request will sign you in without needing to confirm by link or code. Turn “Confirm email” back on for production.

---

## Summary

- **Site URL:** `footydubai://` (not google.com, not localhost).
- **Redirect URLs:** include `footydubai://auth/confirm`.
- **No OTP in email:** check spam; use the link once to confirm; add `{{ .Token }}` (or your template’s variable) to the “Confirm signup” template so the 6-digit code appears; or temporarily disable “Confirm email” for testing.
