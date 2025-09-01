
-- Create a table to track expired stock dispatches
CREATE TABLE public.expired_stock_dispatches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expired_item_id UUID NOT NULL,
  dispatch_destination TEXT NOT NULL CHECK (dispatch_destination IN ('ginger_biscuit', 'pig_feed', 'dog_feed')),
  quantity_dispatched NUMERIC NOT NULL,
  dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  dispatched_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policy for public access (matching your existing pattern)
ALTER TABLE public.expired_stock_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to expired_stock_dispatches" 
  ON public.expired_stock_dispatches 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Add a column to track remaining quantity in expired_items
ALTER TABLE public.expired_items 
ADD COLUMN remaining_quantity NUMERIC DEFAULT NULL;

-- Update existing records to set remaining_quantity equal to original quantity
UPDATE public.expired_items 
SET remaining_quantity = CAST(quantity AS NUMERIC) 
WHERE remaining_quantity IS NULL;

-- Add a status column to track if item is fully dispatched
ALTER TABLE public.expired_items 
ADD COLUMN dispatch_status TEXT DEFAULT 'available' CHECK (dispatch_status IN ('available', 'partially_dispatched', 'fully_dispatched'));
