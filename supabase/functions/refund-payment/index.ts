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

const REFUND_WINDOW_HOURS = 24;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service-role key for admin ops (waitlist promotion) while keeping auth for request user
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

    const { booking_id } = await req.json();

    if (!booking_id) {
      throw new Error('booking_id is required');
    }

    // Use supabaseAdmin for all queries to bypass profiles RLS recursion
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*, game:games(id, start_time, capacity, organizer_id)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // Resolve or auto-create the caller's profile
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
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
        .select('id, role')
        .single();

      if (insertError || !inserted) {
        throw new Error('Profile not found');
      }
      profile = inserted;
    }

    const isPlayer = booking.player_id === profile.id;

    // Organizer: the profile backing the organizer row for this game
    let isOrganizer = false;
    if (booking.game?.organizer_id) {
      const { data: myOrganizer } = await supabaseAdmin
        .from('organizers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();
      if (myOrganizer && myOrganizer.id === booking.game.organizer_id) {
        isOrganizer = true;
      }
    }

    if (!isPlayer && !isOrganizer) {
      throw new Error('Unauthorized to cancel this booking');
    }

    // 24-hour refund window — only enforce for player self-cancellations
    if (isPlayer && !isOrganizer) {
      const gameStart = new Date(booking.game.start_time);
      const hoursUntilGame = (gameStart.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilGame < REFUND_WINDOW_HOURS) {
        throw new Error(
          `Refunds are only available when cancelling at least ${REFUND_WINDOW_HOURS} hours before the game starts.`
        );
      }
    }

    // Refund via Stripe (if payment was made)
    let refund = null;
    if (booking.stripe_payment_intent_id) {
      refund = await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
      });
    }

    // Cancel the booking
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking_id);

    // ── Waitlist promotion ──────────────────────────────────────────────────
    // If the cancelled booking was confirmed, promote ALL eligible waitlisted players
    if (booking.status === 'confirmed' && booking.game?.id) {
      const gameId = booking.game.id;

      // Re-count confirmed spots after the cancellation
      const { data: confirmedBookings } = await supabaseAdmin
        .from('bookings')
        .select('spots')
        .eq('game_id', gameId)
        .eq('status', 'confirmed');

      const confirmedSpots = (confirmedBookings ?? []).reduce(
        (sum: number, b: { spots?: number }) => sum + (b.spots ?? 1),
        0
      );
      let slotsLeft = (booking.game.capacity ?? 0) - confirmedSpots;

      if (slotsLeft > 0) {
        // Find ALL waitlisted bookings ordered by join time (FIFO)
        const { data: waitlisted } = await supabaseAdmin
          .from('bookings')
          .select('id, player_id, spots')
          .eq('game_id', gameId)
          .eq('status', 'waitlisted')
          .order('created_at', { ascending: true });

        if (waitlisted && waitlisted.length > 0) {
          const promoted: { id: string; player_id: string }[] = [];

          // Promote as many waitlisted players as can fit
          for (const wb of waitlisted) {
            if (slotsLeft <= 0) break;
            const wbSpots = wb.spots ?? 1;
            if (wbSpots <= slotsLeft) {
              await supabaseAdmin
                .from('bookings')
                .update({ status: 'confirmed' })
                .eq('id', wb.id);
              slotsLeft -= wbSpots;
              promoted.push({ id: wb.id, player_id: wb.player_id });
            }
          }

          // Send push notifications to ALL promoted players
          for (const p of promoted) {
            const { data: promotedProfile } = await supabaseAdmin
              .from('profiles')
              .select('push_token, name')
              .eq('id', p.player_id)
              .single();

            if (promotedProfile?.push_token) {
              try {
                await fetch('https://exp.host/--/api/v2/push/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: promotedProfile.push_token,
                    title: "You're off the waitlist! 🎉",
                    body: 'A spot opened up — you\'re now confirmed for the game.',
                    data: { game_id: gameId },
                    sound: 'default',
                  }),
                });
              } catch (_) {
                // Push notification failed — booking is still promoted
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, refund }),
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
