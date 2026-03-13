import { initStripe, useStripe } from '@stripe/stripe-react-native';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';

// Initialize Stripe (call this in your app entry point)
export async function initializeStripe(publishableKey: string) {
  await initStripe({
    publishableKey,
    merchantIdentifier: 'merchant.com.footysoul.app',
  });
}

/**
 * Call a Supabase Edge Function via raw fetch.
 *
 * We bypass `supabase.functions.invoke` because its error handling relies on
 * `instanceof FunctionsHttpError`, which ALWAYS fails in React Native
 * (Metro bundler creates different class instances across modules).
 * That causes the real error message to be silently swallowed.
 *
 * Using raw fetch gives us full control over the response.
 */
/**
 * Get a valid access token by always refreshing the session first.
 * Supabase Edge Functions verify JWTs at the INFRASTRUCTURE level (before
 * the function code even runs). If the token is expired by even 1 second,
 * the platform rejects it with "invalid jwt". Always refreshing guarantees
 * we send the freshest possible token.
 */
async function getFreshAccessToken(): Promise<string> {
  // Force-refresh to get a brand new access token
  const { data: refreshData, error: refreshError } =
    await supabase!.auth.refreshSession();

  if (!refreshError && refreshData.session?.access_token) {
    return refreshData.session.access_token;
  }

  // Refresh failed — fall back to cached session (might still be valid)
  const {
    data: { session },
  } = await supabase!.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  throw new Error('Not authenticated — please sign in again.');
}

async function invokeEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
  const accessToken = await getFreshAccessToken();
  const url = `${supabaseUrl}/functions/v1/${functionName}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });

  // Read body as text first (always works), then parse JSON.
  // This avoids body-stream-consumed issues that plagued supabase.functions.invoke.
  const rawText = await response.text();

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    // Not valid JSON — use raw text for the error message
    if (!response.ok) {
      throw new Error(rawText || `Edge function "${functionName}" returned ${response.status}`);
    }
    return undefined as unknown as T;
  }

  if (!response.ok) {
    // Edge functions return { error: "message" } on failure
    const msg =
      (typeof data?.error === 'string' && data.error) ||
      (typeof data?.message === 'string' && data.message) ||
      `Edge function "${functionName}" returned ${response.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export async function createPaymentIntent(gameId: string, spots: number = 1): Promise<string> {
  const data = await invokeEdgeFunction<{ client_secret?: string }>(
    'create-payment-intent',
    { game_id: gameId, spots }
  );

  if (!data?.client_secret) throw new Error('No client secret returned');
  return data.client_secret;
}

export async function confirmPayment(paymentIntentId: string): Promise<void> {
  await invokeEdgeFunction('confirm-payment', {
    payment_intent_id: paymentIntentId,
  });
}

export async function refundBooking(bookingId: string): Promise<void> {
  await invokeEdgeFunction('refund-payment', { booking_id: bookingId });
}

export async function cancelGame(gameId: string): Promise<{ refunded?: number; cancelled?: number }> {
  const data = await invokeEdgeFunction<{ refunded?: number; cancelled?: number }>(
    'cancel-game',
    { game_id: gameId }
  );

  return data ?? {};
}
