-- Migration 017: Add SECURITY DEFINER RPC for updating own profile
-- Fixes "infinite recursion detected in policy for relation profiles" on UPDATE
-- The profiles UPDATE RLS policy triggers recursion when evaluated.
-- Bypass it entirely with a SECURITY DEFINER function.

CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    name  = COALESCE(p_name, name),
    phone = COALESCE(p_phone, phone)
  WHERE user_id = auth.uid();
END;
$$;
