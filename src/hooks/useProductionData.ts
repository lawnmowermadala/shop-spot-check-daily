import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { format, subDays } from 'date-fns';

interface StaffMember {
  id: number;
  name: string;
}

interface Recipe {
  id: string;
  name: string;
  batch_size: number;
  unit: string;
}

interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
}

interface Product {
  id: string;
  name: string;
  code: string;
}

interface ProductionBatch {
  id: string;
  product_id: string;
  product_name: string;
  product_code?: string;
  recipe_id?: string;
  recipe_name?: string;
  quantity_produced: number;
  production_date: string;
  staff_name: string;
  staff_id?: string;
  notes?: string;
  total_ingredient_cost?: number;
  cost_per_unit?: number;
  created_at: string;
}

interface ProductionIngredient {
  id: string;
  batch_id: string;
  ingredient_name: string;
  quantity_used: number;
  unit: string;
  cost_per_unit: number;
  pack_size?: number;
  pack_price?: number;
  created_at: string;
}

interface DailyProduction {
  date: string;
  total_production: number;
}

interface StaffProductionStats {
  staff_name: string;
  total_batches: number;
  total_units: number;
}

export const useProductionData = (date: Date, comparisonDays: number, activeBatchId: string | null, selectedRecipeId: string | null) => {
  const queryClient = useQueryClient();

  // Fetch staff members
  const { data: staffMembers = [] } = useQuery<StaffMember[]>({
    queryKey: ['staff_members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch recipes
  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch recipe ingredients - updated to use selectedRecipeId
  const { data: recipeIngredients = [] } = useQuery<RecipeIngredient[]>({
    queryKey: ['recipe_ingredients', selectedRecipeId],
    queryFn: async () => {
      if (!selectedRecipeId) return [];
      
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', selectedRecipeId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRecipeId
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch production batches
  const { data: productionBatches = [] } = useQuery<ProductionBatch[]>({
    queryKey: ['production_batches', date.toISOString().split('T')[0]],
    queryFn: async () => {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('production_batches')
        .select('*, products(name, code), recipes(name)')
        .eq('production_date', dateStr)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(batch => ({
        ...batch,
        product_name: (batch.products as any)?.name || 'Unknown',
        product_code: (batch.products as any)?.code || 'N/A',
        recipe_name: (batch.recipes as any)?.name || 'No Recipe'
      }));
    }
  });

  // Fetch batch ingredients
  const { data: batchIngredients = [] } = useQuery<ProductionIngredient[]>({
    queryKey: ['batch_ingredients', activeBatchId],
    queryFn: async () => {
      if (!activeBatchId) return [];
      const { data, error } = await supabase
        .from('production_ingredients')
        .select('*')
        .eq('batch_id', activeBatchId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeBatchId
  });

  // Fetch historical production data
  const { data: historicalProduction = [] } = useQuery<DailyProduction[]>({
    queryKey: ['historical_production', comparisonDays, date.toISOString().split('T')[0]],
    queryFn: async () => {
      const endDate = date;
      const startDate = subDays(endDate, comparisonDays);
      
      const { data, error } = await supabase
        .from('production_batches')
        .select('production_date, quantity_produced')
        .gte('production_date', format(startDate, 'yyyy-MM-dd'))
        .lte('production_date', format(endDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      const dailyTotals = new Map<string, number>();
      
      data.forEach(batch => {
        const dateKey = format(new Date(batch.production_date), 'yyyy-MM-dd');
        const existing = dailyTotals.get(dateKey) || 0;
        dailyTotals.set(dateKey, existing + batch.quantity_produced);
      });
      
      return Array.from(dailyTotals.entries()).map(([date, total_production]) => ({
        date,
        total_production
      }));
    }
  });

  // Fetch staff production analytics
  const { data: staffStats = [] } = useQuery<StaffProductionStats[]>({
    queryKey: ['staff_production_stats', comparisonDays, date.toISOString().split('T')[0]],
    queryFn: async () => {
      const endDate = date;
      const startDate = subDays(endDate, comparisonDays);
      
      const { data, error } = await supabase
        .from('production_batches')
        .select('staff_name, quantity_produced')
        .gte('production_date', format(startDate, 'yyyy-MM-dd'))
        .lte('production_date', format(endDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      const statsMap = new Map<string, StaffProductionStats>();
      
      data.forEach(batch => {
        const existing = statsMap.get(batch.staff_name) || {
          staff_name: batch.staff_name,
          total_batches: 0,
          total_units: 0
        };
        
        existing.total_batches += 1;
        existing.total_units += batch.quantity_produced;
        statsMap.set(batch.staff_name, existing);
      });
      
      return Array.from(statsMap.values()).sort((a, b) => b.total_units - a.total_units);
    }
  });

  // Mutations
  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const { error: ingredientsError } = await supabase
        .from('production_ingredients')
        .delete()
        .eq('batch_id', batchId);

      if (ingredientsError) throw ingredientsError;

      const { error } = await supabase
        .from('production_batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
      queryClient.invalidateQueries({ queryKey: ['staff_production_stats'] });
      toast.success('Production batch deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateBatchCostMutation = useMutation({
    mutationFn: async (batchId: string) => {
      // Get batch info including recipe_id
      const { data: batch, error: batchError } = await supabase
        .from('production_batches')
        .select('quantity_produced, recipe_id')
        .eq('id', batchId)
        .single();
      
      if (batchError) throw batchError;

      const { data: ingredients, error: ingredientsError } = await supabase
        .from('production_ingredients')
        .select('*')
        .eq('batch_id', batchId);
      
      if (ingredientsError) throw ingredientsError;
      
      const totalIngredientCost = ingredients.reduce(
        (sum, ingredient) => sum + (ingredient.quantity_used * ingredient.cost_per_unit),
        0
      );
      
      let costPerUnit = 0;

      // If batch has a recipe, calculate fixed cost per unit from recipe
      if (batch.recipe_id) {
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .select('batch_size')
          .eq('id', batch.recipe_id)
          .single();

        if (recipeError) throw recipeError;

        const { data: recipeIngredients, error: recipeIngrError } = await supabase
          .from('recipe_ingredients')
          .select('quantity, cost_per_unit')
          .eq('recipe_id', batch.recipe_id);

        if (recipeIngrError) throw recipeIngrError;

        const originalRecipeTotalCost = recipeIngredients.reduce(
          (sum, ing) => sum + (ing.quantity * ing.cost_per_unit),
          0
        );

        // Fixed cost per unit based on recipe - NEVER changes with quantity
        costPerUnit = recipe.batch_size > 0 ? originalRecipeTotalCost / recipe.batch_size : 0;
      } else {
        // No recipe: calculate dynamically (old behavior)
        costPerUnit = batch.quantity_produced > 0 
          ? totalIngredientCost / batch.quantity_produced 
          : 0;
      }
      
      const { error: updateError } = await supabase
        .from('production_batches')
        .update({
          total_ingredient_cost: totalIngredientCost,
          cost_per_unit: costPerUnit
        })
        .eq('id', batchId);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to update batch cost: ' + error.message);
    }
  });

  return {
    staffMembers,
    recipes,
    recipeIngredients,
    products,
    productionBatches,
    batchIngredients,
    historicalProduction,
    staffStats,
    deleteBatchMutation,
    updateBatchCostMutation,
    queryClient
  };
};
