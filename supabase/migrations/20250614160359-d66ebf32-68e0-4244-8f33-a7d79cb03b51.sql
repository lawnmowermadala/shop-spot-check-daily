
-- Add pack_size and pack_price columns to production_ingredients table
ALTER TABLE public.production_ingredients
  ADD COLUMN pack_size numeric,
  ADD COLUMN pack_price numeric;

-- Optionally, you could set defaults if required (e.g., pack_size default 1, pack_price default 0).
