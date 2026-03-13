import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type MapboxFeature = {
  place_name: string;
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === 'string' ? body.query : (body?.body?.query ?? '');
    const trimmed = String(query ?? '').trim();
    if (!trimmed || trimmed.length < 3) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const token = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    if (!token) {
      throw new Error('MAPBOX_ACCESS_TOKEN is not configured');
    }

    const types = 'address,place,locality,poi';
    const country = 'AE';
    const limit = 8;
    let searchTerm = trimmed;
    let encoded = encodeURIComponent(searchTerm);
    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?autocomplete=true&limit=${limit}&types=${types}&country=${country}&access_token=${token}`;
    let res = await fetch(url);
    if (!res.ok) throw new Error(`Mapbox HTTP ${res.status}`);
    let data = (await res.json()) as MapboxResponse;
    let features = data.features ?? [];
    if (features.length === 0 && !searchTerm.toLowerCase().includes('dubai')) {
      searchTerm = `${trimmed}, Dubai`;
      encoded = encodeURIComponent(searchTerm);
      url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?autocomplete=true&limit=${limit}&types=${types}&country=${country}&access_token=${token}`;
      res = await fetch(url);
      if (res.ok) {
        data = (await res.json()) as MapboxResponse;
        features = data.features ?? [];
      }
    }
    const suggestions = features.map((f) => ({ label: f.place_name, address: f.place_name }));

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});




