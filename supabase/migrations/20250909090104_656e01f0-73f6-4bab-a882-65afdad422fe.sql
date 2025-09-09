-- Create sales transactions table for POS functionality
CREATE TABLE public.sales_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_number TEXT NOT NULL UNIQUE,
  cashier_id UUID,
  customer_name TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_status TEXT NOT NULL DEFAULT 'completed',
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Create sales transaction items table
CREATE TABLE public.sales_transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL,
  product_id UUID,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  line_total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment transactions table
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_transaction_id UUID NOT NULL,
  payment_method TEXT NOT NULL,
  amount_paid NUMERIC NOT NULL,
  change_given NUMERIC DEFAULT 0,
  reference_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public access to sales_transactions" 
ON public.sales_transactions FOR ALL USING (true);

CREATE POLICY "Allow public access to sales_transaction_items" 
ON public.sales_transaction_items FOR ALL USING (true);

CREATE POLICY "Allow public access to payment_transactions" 
ON public.payment_transactions FOR ALL USING (true);

-- Create foreign key relationships
ALTER TABLE public.sales_transaction_items 
ADD CONSTRAINT fk_transaction FOREIGN KEY (transaction_id) REFERENCES public.sales_transactions(id) ON DELETE CASCADE;

ALTER TABLE public.payment_transactions 
ADD CONSTRAINT fk_sales_transaction FOREIGN KEY (sales_transaction_id) REFERENCES public.sales_transactions(id) ON DELETE CASCADE;

-- Create function to generate transaction numbers
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TXN-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(nextval('transaction_sequence')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create sequence for transaction numbers
CREATE SEQUENCE IF NOT EXISTS transaction_sequence START 1;