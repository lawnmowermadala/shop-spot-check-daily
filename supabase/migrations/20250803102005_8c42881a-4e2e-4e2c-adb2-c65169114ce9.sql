
-- Create kitchen ingredient stock table
CREATE TABLE public.kitchen_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID REFERENCES public.ingredients(id) NOT NULL,
  ingredient_name TEXT NOT NULL,
  pack_size NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  quantity_on_hand NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC GENERATED ALWAYS AS (quantity_on_hand * cost_per_unit) STORED,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ingredient transfers table to track all transfers
CREATE TABLE public.ingredient_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_ingredient_id UUID REFERENCES public.ingredients(id),
  to_ingredient_id UUID REFERENCES public.ingredients(id),
  from_stock_id UUID REFERENCES public.kitchen_stock(id),
  to_stock_id UUID REFERENCES public.kitchen_stock(id),
  quantity_transferred NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  from_cost_per_unit NUMERIC NOT NULL,
  to_cost_per_unit NUMERIC NOT NULL,
  price_difference NUMERIC GENERATED ALWAYS AS (to_cost_per_unit - from_cost_per_unit) STORED,
  transfer_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('ingredient_to_stock', 'stock_to_stock', 'production_usage'))
);

-- Create production ingredient usage tracking table
CREATE TABLE public.production_stock_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES public.production_batches(id) NOT NULL,
  kitchen_stock_id UUID REFERENCES public.kitchen_stock(id) NOT NULL,
  ingredient_name TEXT NOT NULL,
  quantity_used NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  cost_per_unit NUMERIC NOT NULL,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity_used * cost_per_unit) STORED,
  usage_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.kitchen_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_stock_usage ENABLE ROW LEVEL SECURITY;

-- Allow public access to kitchen stock
CREATE POLICY "Allow public access to kitchen_stock" 
ON public.kitchen_stock 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Allow public access to ingredient transfers
CREATE POLICY "Allow public access to ingredient_transfers" 
ON public.ingredient_transfers 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Allow public access to production stock usage
CREATE POLICY "Allow public access to production_stock_usage" 
ON public.production_stock_usage 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to automatically update kitchen stock when ingredients are used in production
CREATE OR REPLACE FUNCTION update_kitchen_stock_on_production()
RETURNS TRIGGER AS $$
DECLARE
  stock_record RECORD;
BEGIN
  -- Find matching kitchen stock for the ingredient
  SELECT * INTO stock_record 
  FROM kitchen_stock 
  WHERE ingredient_name = NEW.ingredient_name 
  AND quantity_on_hand >= NEW.quantity_used
  ORDER BY created_at ASC 
  LIMIT 1;

  IF FOUND THEN
    -- Update kitchen stock quantity
    UPDATE kitchen_stock 
    SET quantity_on_hand = quantity_on_hand - NEW.quantity_used,
        last_updated = now()
    WHERE id = stock_record.id;

    -- Record the usage
    INSERT INTO production_stock_usage (
      batch_id,
      kitchen_stock_id,
      ingredient_name,
      quantity_used,
      unit,
      cost_per_unit
    ) VALUES (
      NEW.batch_id,
      stock_record.id,
      NEW.ingredient_name,
      NEW.quantity_used,
      NEW.unit,
      stock_record.cost_per_unit
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically deduct from kitchen stock when production ingredients are added
CREATE TRIGGER trigger_update_kitchen_stock
  AFTER INSERT ON production_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_kitchen_stock_on_production();
