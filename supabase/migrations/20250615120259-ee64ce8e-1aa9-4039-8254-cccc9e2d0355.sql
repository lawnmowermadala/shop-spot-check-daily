
-- Add the punctuality column to the ratings table
ALTER TABLE public.ratings 
ADD COLUMN IF NOT EXISTS punctuality integer NOT NULL DEFAULT 5;
