import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Fallback handler for when the app crashes between Stripe payment success and
// the confirm-payment Edge Function call. Stripe retries this webhook for 3 days.
serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Webhook secret not configured', { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  // Only handle successful payments
  if (event.type !== 'payment_intent.succeeded') {
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const gameId = paymentIntent.metadata.game_id;
  const playerId = paymentIntent.metadata.player_id;
  const spots = Math.min(3, Math.max(1, parseInt(paymentIntent.metadata.spots || '1', 10) || 1));

  if (!gameId || !playerId) {
    // PaymentIntent wasn't created by this app — ignore
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Idempotency check: confirm-payment may have already created the booking
  const { data: existing } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ received: true, status: 'already_booked' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  // Get game capacity
  const { data: game } = await supabaseAdmin
    .from('games')
    .select('capacity')
    .eq('id', gameId)
    .single();

  if (!game) {
    return new Response('Game not found', { status: 404 });
  }

  // Count confirmed spots
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('spots')
    .eq('game_id', gameId)
    .eq('status', 'confirmed');

  const confirmedSpots = (bookings ?? []).reduce(
    (sum: number, b: { spots?: number }) => sum + (b.spots ?? 1),
    0
  );
  const remaining = game.capacity - confirmedSpots;

  const { error } = await supabaseAdmin.from('bookings').insert({
    game_id: gameId,
    player_id: playerId,
    spots,
    paid_amount: paymentIntent.amount / 100,
    stripe_payment_intent_id: paymentIntent.id,
    status: remaining >= spots ? 'confirmed' : 'waitlisted',
  });

  // 23505 = unique violation — already booked (race with confirm-payment), safe to ignore
  if (error && error.code !== '23505') {
    return new Response(`Database error: ${error.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true, status: 'booked' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
