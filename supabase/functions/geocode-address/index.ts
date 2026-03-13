import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Geocode an address using OpenStreetMap Nominatim (no API key required).
// Usage policy: https://operations.osmfoundation.org/policies/nominatim/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const address = typeof body?.address === 'string' ? body.address.trim() : '';
    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Missing address' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'FootySoul/1.0 (contact@footysoul.app)',
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'Geocoding service unavailable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Address not found. Try a more specific address.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const first = data[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return new Response(
        JSON.stringify({ error: 'Invalid geocoding result' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    return new Response(
      JSON.stringify({ latitude: lat, longitude: lon }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e instanceof Error ? e.message : 'Geocoding failed') }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
