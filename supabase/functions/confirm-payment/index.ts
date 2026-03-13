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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Service-role client for capacity checks and booking insert — bypasses
    // bookings RLS so we see all confirmed bookings, not just the current user's.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { payment_intent_id } = await req.json();

    if (!payment_intent_id) {
      throw new Error('payment_intent_id is required');
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment not succeeded');
    }

    const gameId = paymentIntent.metadata.game_id;
    const playerId = paymentIntent.metadata.player_id;
    const spots = Math.min(3, Math.max(1, parseInt(paymentIntent.metadata.spots || '1', 10) || 1));

    if (!gameId || !playerId) {
      throw new Error('Invalid payment intent metadata');
    }

    // Check capacity again (race condition protection)
    const { data: game } = await supabaseClient
      .from('games')
      .select('capacity')
      .eq('id', gameId)
      .single();

    if (!game) {
      throw new Error('Game not found');
    }

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('spots')
      .eq('game_id', gameId)
      .eq('status', 'confirmed');

    const confirmedSpots = (bookings ?? []).reduce((sum: number, b: { spots?: number }) => sum + (b.spots ?? 1), 0);
    const remaining = game.capacity - confirmedSpots;

    // Create booking
    const bookingData: any = {
      game_id: gameId,
      player_id: playerId,
      spots,
      paid_amount: paymentIntent.amount / 100,
      stripe_payment_intent_id: payment_intent_id,
      status: remaining >= spots ? 'confirmed' : 'waitlisted',
    };

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      // If duplicate, payment was already processed
      if (bookingError.code === '23505') {
        return new Response(
          JSON.stringify({ success: true, message: 'Already booked' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
      throw bookingError;
    }

    return new Response(
      JSON.stringify({ success: true, booking }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

