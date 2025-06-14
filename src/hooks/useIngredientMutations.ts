
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

export const useIngredientMutations = (activeBatchId: string | null, updateBatchCost: (batchId: string) => void) => {
  const queryClient = useQueryClient();

  const addIngredientMutation = useMutation({
    mutationFn: async (ingredientData: any) => {
      if (!activeBatchId || !ingredientData.ingredient_name || !ingredientData.quantity_used) {
        throw new Error('Please fill all required fields');
      }
      const { data, error } = await supabase
        .from('production_ingredients')
        .insert({
          batch_id: activeBatchId,
          ingredient_name: ingredientData.ingredient_name,
          quantity_used: Number(ingredientData.quantity_used),
          unit: ingredientData.unit,
          cost_per_unit: Number(ingredientData.cost_per_unit) || 0,
          pack_size: ingredientData.pack_size ? Number(ingredientData.pack_size) : null,
          pack_price: ingredientData.pack_price ? Number(ingredientData.pack_price) : null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_ingredients'] });
      toast.success('Ingredient added successfully!');
      if (activeBatchId) {
        updateBatchCost(activeBatchId);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: async (ingredientId: string) => {
      const { error } = await supabase
        .from('production_ingredients')
        .delete()
        .eq('id', ingredientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_ingredients'] });
      toast.success('Ingredient removed successfully!');
      if (activeBatchId) {
        updateBatchCost(activeBatchId);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateIngredientMutation = useMutation({
    mutationFn: async ({ ingredientId, data }: { ingredientId: string, data: any }) => {
      const { error } = await supabase
        .from('production_ingredients')
        .update({
          ingredient_name: data.ingredient_name,
          quantity_used: Number(data.quantity_used),
          unit: data.unit,
          cost_per_unit: Number(data.cost_per_unit) || 0,
          pack_size: data.pack_size ? Number(data.pack_size) : null,
          pack_price: data.pack_price ? Number(data.pack_price) : null
        })
        .eq('id', ingredientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_ingredients'] });
      toast.success('Ingredient updated successfully!');
      if (activeBatchId) {
        updateBatchCost(activeBatchId);
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to update ingredient: ' + error.message);
    }
  });

  return {
    addIngredientMutation,
    deleteIngredientMutation,
    updateIngredientMutation
  };
};
