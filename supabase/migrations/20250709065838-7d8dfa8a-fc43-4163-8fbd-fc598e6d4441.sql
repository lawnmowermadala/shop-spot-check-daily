-- Add product reference and cost tracking to expired_items table
ALTER TABLE public.expired_items 
ADD COLUMN product_id UUID REFERENCES public.products(id),
ADD COLUMN cost_per_unit DECIMAL(10,2) DEFAULT 0,
ADD COLUMN selling_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN total_cost_loss DECIMAL(10,2) GENERATED ALWAYS AS (
  CASE 
    WHEN quantity ~ '^[0-9]+\.?[0-9]*$' 
    THEN CAST(quantity AS DECIMAL) * selling_price 
    ELSE 0 
  END
) STORED;