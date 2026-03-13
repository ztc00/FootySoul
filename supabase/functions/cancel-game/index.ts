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

    const { game_id } = await req.json();
    if (!game_id) {
      throw new Error('game_id is required');
    }

    // Fetch game
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('id, organizer_id')
      .eq('id', game_id)
      .single();

    if (gameError || !game) {
      throw new Error('Game not found');
    }

    // Verify the caller is the organizer — look up directly, no nested embeds
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!callerProfile) {
      throw new Error('Profile not found');
    }

    const { data: organizer } = await supabaseAdmin
      .from('organizers')
      .select('id')
      .eq('profile_id', callerProfile.id)
      .maybeSingle();

    if (!organizer || organizer.id !== game.organizer_id) {
      throw new Error('Unauthorized — only the game organizer can cancel');
    }

    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id, status, paid_amount, stripe_payment_intent_id')
      .eq('game_id', game_id)
      .neq('status', 'cancelled');

    if (bookingsError) {
      throw bookingsError;
    }

    let refunded = 0;
    let cancelled = 0;

    for (const booking of bookings ?? []) {
      if (booking.stripe_payment_intent_id && (booking.paid_amount ?? 0) > 0) {
        await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
        });
        refunded += 1;
      }

      const { error: cancelError } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);

      if (cancelError) {
        throw cancelError;
      }
      cancelled += 1;
    }

    const { error: deleteError } = await supabaseAdmin
      .from('games')
      .delete()
      .eq('id', game_id);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({ success: true, refunded, cancelled }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
