
-- Create a table to track kitchen stock adjustments
CREATE TABLE public.kitchen_stock_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kitchen_stock_id UUID NOT NULL REFERENCES kitchen_stock(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('increase', 'decrease', 'correction')),
  quantity_adjusted NUMERIC NOT NULL,
  previous_quantity NUMERIC NOT NULL,
  new_quantity NUMERIC NOT NULL,
  reason TEXT,
  adjusted_by TEXT NOT NULL,
  adjustment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policy for kitchen stock adjustments
ALTER TABLE public.kitchen_stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to kitchen_stock_adjustments" 
  ON public.kitchen_stock_adjustments 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create a trigger function to automatically deduct kitchen stock when production ingredients are used
CREATE OR REPLACE FUNCTION public.deduct_kitchen_stock_on_production()
RETURNS TRIGGER AS $$
DECLARE
  stock_record RECORD;
  remaining_quantity NUMERIC;
BEGIN
  -- Find matching kitchen stock for the ingredient
  SELECT * INTO stock_record 
  FROM kitchen_stock 
  WHERE ingredient_name = NEW.ingredient_name 
  AND quantity_on_hand >= NEW.quantity_used
  ORDER BY created_at ASC 
  LIMIT 1;

  IF FOUND THEN
    -- Calculate new quantity
    remaining_quantity := stock_record.quantity_on_hand - NEW.quantity_used;
    
    -- Update kitchen stock quantity
    UPDATE kitchen_stock 
    SET quantity_on_hand = remaining_quantity,
        last_updated = now()
    WHERE id = stock_record.id;

    -- Log the deduction as an adjustment
    INSERT INTO kitchen_stock_adjustments (
      kitchen_stock_id,
      ingredient_name,
      adjustment_type,
      quantity_adjusted,
      previous_quantity,
      new_quantity,
      reason,
      adjusted_by
    ) VALUES (
      stock_record.id,
      NEW.ingredient_name,
      'decrease',
      NEW.quantity_used,
      stock_record.quantity_on_hand,
      remaining_quantity,
      'Automatic deduction from production batch: ' || NEW.batch_id,
      'System'
    );

    -- Update the production ingredient with the actual cost from kitchen stock
    NEW.cost_per_unit := stock_record.cost_per_unit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on production_ingredients table
CREATE TRIGGER trigger_deduct_kitchen_stock
  BEFORE INSERT ON production_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION deduct_kitchen_stock_on_production();

-- Update kitchen_stock table to have a computed total_value column
ALTER TABLE kitchen_stock 
DROP COLUMN IF EXISTS total_value;

ALTER TABLE kitchen_stock 
ADD COLUMN total_value NUMERIC GENERATED ALWAYS AS (quantity_on_hand * cost_per_unit) STORED;
