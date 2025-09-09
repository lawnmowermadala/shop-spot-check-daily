-- Enable RLS for tables that don't have it (focusing on existing tables first)
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expired_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_cost_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_ingredient_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Create policies for all these tables to allow public access (since no auth is currently implemented)
CREATE POLICY "Allow public access to assignments" ON public.assignments FOR ALL USING (true);
CREATE POLICY "Allow public access to expired_items" ON public.expired_items FOR ALL USING (true);
CREATE POLICY "Allow public access to ingredients" ON public.ingredients FOR ALL USING (true);
CREATE POLICY "Allow public access to pos_users" ON public.pos_users FOR ALL USING (true);
CREATE POLICY "Allow public access to production_batches" ON public.production_batches FOR ALL USING (true);
CREATE POLICY "Allow public access to production_cost_batches" ON public.production_cost_batches FOR ALL USING (true);
CREATE POLICY "Allow public access to production_ingredient_usage" ON public.production_ingredient_usage FOR ALL USING (true);
CREATE POLICY "Allow public access to production_ingredients" ON public.production_ingredients FOR ALL USING (true);
CREATE POLICY "Allow public access to products" ON public.products FOR ALL USING (true);
CREATE POLICY "Allow public access to ratings" ON public.ratings FOR ALL USING (true);
CREATE POLICY "Allow public access to recipe_ingredients" ON public.recipe_ingredients FOR ALL USING (true);
CREATE POLICY "Allow public access to recipes" ON public.recipes FOR ALL USING (true);