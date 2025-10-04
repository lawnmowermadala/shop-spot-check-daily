-- Add price, category, and show_on_pos fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS show_on_pos BOOLEAN DEFAULT false;