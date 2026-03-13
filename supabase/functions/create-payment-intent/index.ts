import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecret || stripeSecret.length < 10) {
    return new Response(
      JSON.stringify({ error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to Edge Function secrets.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const jwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!jwt || !jwt.trim()) {
      throw new Error('Please sign in again to continue.');
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );

    // Service-role client for capacity checks — bypasses bookings RLS so we
    // see all confirmed bookings, not just the current user's.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);

    if (userError || !user) {
      throw new Error('Please sign in again to continue.');
    }

    const body = await req.json();
    const game_id = body?.game_id;
    const spots = Math.min(3, Math.max(1, typeof body?.spots === 'number' ? body.spots : 1));

    if (!game_id) {
      throw new Error('game_id is required');
    }

    // Get game details
    const { data: game, error: gameError } = await supabaseClient
      .from('games')
      .select('*, organizer:organizers(*)')
      .eq('id', game_id)
      .single();

    if (gameError || !game) {
      throw new Error('Game not found');
    }

    // Use supabaseAdmin for profiles to bypass RLS recursion and auto-create profile if missing
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: user.id,
          phone: '',
          email: user.email ?? null,
          role: 'player',
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error('Profile not found');
      }
      profile = inserted;
    }

    const { data: existingBooking } = await supabaseClient
      .from('bookings')
      .select('id')
      .eq('game_id', game_id)
      .eq('player_id', profile.id)
      .single();

    if (existingBooking) {
      throw new Error('Already booked');
    }

    // Check capacity using admin client so RLS doesn't hide other players' bookings
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('spots')
      .eq('game_id', game_id)
      .eq('status', 'confirmed');

    const confirmedSpots = (bookings ?? []).reduce((sum: number, b: { spots?: number }) => sum + (b.spots ?? 1), 0);
    const remaining = game.capacity - confirmedSpots;

    if (remaining < spots) {
      throw new Error(remaining <= 0 ? 'Game is full' : `Only ${remaining} spot(s) left`);
    }

    // Create payment intent (amount = price * spots)
    // Idempotency key: one PaymentIntent per player per game — safe to retry on network errors.
    const amountCents = Math.round(game.price * spots * 100);
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: (game.currency || 'AED').toLowerCase(),
        metadata: {
          game_id: game_id,
          player_id: profile.id,
          user_id: user.id,
          spots: String(spots),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      },
      { idempotencyKey: `pi-${game_id}-${profile.id}` }
    );

    return new Response(
      JSON.stringify({ client_secret: paymentIntent.client_secret }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    let message = 'Something went wrong';
    if (error instanceof Error) message = error.message;
    else if (error && typeof error === 'object' && 'message' in error) message = String((error as { message: unknown }).message);
    const isAuthError = message === 'Unauthorized' || message === 'Please sign in again to continue.';
    const status = isAuthError ? 401 : message === 'Game not found' || message === 'Profile not found' ? 404 : 400;
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: status === 401 ? 401 : status === 404 ? 404 : 500,
      }
    );
  }
});

