import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  if (!serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Backfill not configured. Add SERVICE_ROLE_KEY to Edge Function secrets.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: games, error: fetchError } = await supabase
      .from('games')
      .select('id, location_name, address')
      .is('latitude', null)
      .not('address', 'is', null);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const toGeocode = (games ?? []).filter(
      (g) => g.address && String(g.address).trim().length > 0
    );
    let updated = 0;

    async function geocodeNominatim(query: string): Promise<{ lat: number; lon: number } | null> {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'FootySoul/1.0 (https://footysoul.app)', 'Accept-Language': 'en' },
      });
      if (!res.ok) return null;
      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        return null;
      }
      if (!Array.isArray(data) || data.length === 0) return null;
      const first = data[0] as { lat?: string; lon?: string };
      const lat = parseFloat(first.lat ?? '');
      const lon = parseFloat(first.lon ?? '');
      if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
      return { lat, lon };
    }

    async function geocodePhoton(query: string): Promise<{ lat: number; lon: number } | null> {
      const url = new URL('https://photon.komoot.io/api/');
      url.searchParams.set('q', query);
      url.searchParams.set('limit', '1');
      const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return null;
      const text = await res.text();
      let data: { features?: Array<{ geometry?: { coordinates?: [number, number] } }> };
      try {
        data = JSON.parse(text);
      } catch {
        return null;
      }
      const feat = data.features?.[0];
      const coords = feat?.geometry?.coordinates;
      if (!coords || coords.length < 2) return null;
      const lon = coords[0];
      const lat = coords[1];
      if (typeof lat !== 'number' || typeof lon !== 'number') return null;
      return { lat, lon };
    }

    async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
      const r = await geocodeNominatim(query);
      if (r) return r;
      return geocodePhoton(query);
    }

    for (const game of toGeocode) {
      const addr = (game.address || '').trim();
      const name = (game.location_name || '').trim();
      const combined = [name, addr].filter(Boolean).join(', ');
      const withCountry = combined.includes('UAE') || combined.includes('United Arab Emirates') ? combined : `${combined}, UAE`;

      try {
        let coords = await geocode(withCountry);
        if (!coords) coords = await geocode(addr);
        if (!coords) coords = await geocode(combined);
        if (!coords) continue;

        const { error: updateError } = await supabase
          .from('games')
          .update({ latitude: coords.lat, longitude: coords.lon })
          .eq('id', game.id);

        if (!updateError) updated++;
      } catch (_) {
        // skip this game
      }

      await delay(1100);
    }

    return new Response(
      JSON.stringify({ updated, total: toGeocode.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Backfill failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
