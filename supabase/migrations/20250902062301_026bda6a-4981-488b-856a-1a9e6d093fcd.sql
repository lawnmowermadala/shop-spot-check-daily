
-- Add missing columns to expired_items table
ALTER TABLE expired_items 
ADD COLUMN IF NOT EXISTS remaining_quantity numeric,
ADD COLUMN IF NOT EXISTS dispatch_status text DEFAULT 'available';

-- Update existing records to set remaining_quantity equal to quantity if it's null
UPDATE expired_items 
SET remaining_quantity = CAST(quantity as numeric)
WHERE remaining_quantity IS NULL;

-- Create expired_stock_dispatches table
CREATE TABLE IF NOT EXISTS expired_stock_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expired_item_id uuid NOT NULL REFERENCES expired_items(id),
  dispatch_destination text NOT NULL,
  quantity_dispatched numeric NOT NULL,
  dispatch_date date NOT NULL DEFAULT CURRENT_DATE,
  dispatched_by text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE expired_stock_dispatches ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow public access to expired_stock_dispatches" 
  ON expired_stock_dispatches 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
