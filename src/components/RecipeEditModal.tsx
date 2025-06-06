import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, Edit, Check, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

interface Recipe {
  id: string;
  name: string;
  batch_size: number;
  unit: string;
  description?: string;
}

interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  pack_size?: number;
  pack_price?: number;
  pack_unit?: string;
  used_unit?: string;
  quantity_used?: number;
  calculated_cost?: number;
  barcode?: string;
}

interface RecipeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string | null;
}

const RecipeEditModal = ({ isOpen, onClose, recipeId }: RecipeEditModalProps) => {
  const queryClient = useQueryClient();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null);
  const [editedIngredient, setEditedIngredient] = useState<Partial<RecipeIngredient>>({});
  const [newIngredient, setNewIngredient] = useState({
    ingredient_name: '',
    quantity: '',
    unit: 'kg',
    cost_per_unit: '',
    pack_size: '',
    pack_price: '',
    pack_unit: 'kg',
    used_unit: 'g',
    quantity_used: ''
  });

  // Fetch recipe details
  const { data: recipeData } = useQuery<Recipe>({
    queryKey: ['recipe', recipeId],
    queryFn: async () => {
      if (!recipeId) throw new Error('No recipe ID');
      
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!recipeId && isOpen
  });

  // Fetch recipe ingredients
  const { data: ingredients = [] } = useQuery<RecipeIngredient[]>({
    queryKey: ['recipe_ingredients', recipeId],
    queryFn: async () => {
      if (!recipeId) return [];
      
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('ingredient_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!recipeId && isOpen
  });

  useEffect(() => {
    if (recipeData) {
      setRecipe(recipeData);
    }
  }, [recipeData]);

  // Update recipe mutation
  const updateRecipeMutation = useMutation({
    mutationFn: async () => {
      if (!recipe || !recipeId) throw new Error('No recipe data');
      
      const { error } = await supabase
        .from('recipes')
        .update({
          name: recipe.name,
          batch_size: recipe.batch_size,
          unit: recipe.unit,
          description: recipe.description
        })
        .eq('id', recipeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      toast.success('Recipe updated successfully!');
    },
    onError: (error: Error) => {
      toast.error('Failed to update recipe: ' + error.message);
    }
  });

  // Update ingredient mutation
  const updateIngredientMutation = useMutation({
    mutationFn: async ({ ingredientId, updates }: { ingredientId: string; updates: Partial<RecipeIngredient> }) => {
      const calculatedCost = updates.pack_price && updates.pack_size
        ? (Number(updates.pack_price) / Number(updates.pack_size)) * Number(updates.quantity_used || updates.quantity)
        : Number(updates.cost_per_unit) * Number(updates.quantity);

      const { error } = await supabase
        .from('recipe_ingredients')
        .update({
          ...updates,
          calculated_cost: calculatedCost
        })
        .eq('id', ingredientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe_ingredients', recipeId] });
      setEditingIngredient(null);
      setEditedIngredient({});
      toast.success('Ingredient updated successfully!');
    },
    onError: (error: Error) => {
      toast.error('Failed to update ingredient: ' + error.message);
    }
  });

  // Add ingredient mutation
  const addIngredientMutation = useMutation({
    mutationFn: async () => {
      if (!recipeId || !newIngredient.ingredient_name || !newIngredient.quantity) {
        throw new Error('Please fill all required fields');
      }

      const calculatedCost = Number(newIngredient.pack_price) > 0 && Number(newIngredient.pack_size) > 0
        ? (Number(newIngredient.pack_price) / Number(newIngredient.pack_size)) * Number(newIngredient.quantity_used || newIngredient.quantity)
        : Number(newIngredient.cost_per_unit) * Number(newIngredient.quantity);

      const { error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: recipeId,
          ingredient_name: newIngredient.ingredient_name,
          quantity: Number(newIngredient.quantity),
          unit: newIngredient.unit,
          cost_per_unit: Number(newIngredient.cost_per_unit) || 0,
          pack_size: Number(newIngredient.pack_size) || null,
          pack_price: Number(newIngredient.pack_price) || null,
          pack_unit: newIngredient.pack_unit || null,
          used_unit: newIngredient.used_unit || null,
          quantity_used: Number(newIngredient.quantity_used) || null,
          calculated_cost: calculatedCost
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe_ingredients', recipeId] });
      setNewIngredient({
        ingredient_name: '',
        quantity: '',
        unit: 'kg',
        cost_per_unit: '',
        pack_size: '',
        pack_price: '',
        pack_unit: 'kg',
        used_unit: 'g',
        quantity_used: ''
      });
      toast.success('Ingredient added successfully!');
    },
    onError: (error: Error) => {
      toast.error('Failed to add ingredient: ' + error.message);
    }
  });

  // Delete ingredient mutation
  const deleteIngredientMutation = useMutation({
    mutationFn: async (ingredientId: string) => {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', ingredientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe_ingredients', recipeId] });
      toast.success('Ingredient removed successfully!');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove ingredient: ' + error.message);
    }
  });

  const handleSaveRecipe = () => {
    updateRecipeMutation.mutate();
  };

  const handleAddIngredient = () => {
    addIngredientMutation.mutate();
  };

  const handleEditIngredient = (ingredient: RecipeIngredient) => {
    setEditingIngredient(ingredient.id);
    setEditedIngredient(ingredient);
  };

  const handleSaveIngredient = () => {
    if (editingIngredient && editedIngredient) {
      updateIngredientMutation.mutate({
        ingredientId: editingIngredient,
        updates: editedIngredient
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingIngredient(null);
    setEditedIngredient({});
  };

  const totalCost = ingredients.reduce((sum, ing) => sum + (ing.calculated_cost || (ing.cost_per_unit * ing.quantity)), 0);
  const costPerUnit = recipe && recipe.batch_size > 0 ? totalCost / recipe.batch_size : 0;

  if (!recipe) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recipe: {recipe.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Recipe Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Recipe Name</label>
              <Input
                value={recipe.name}
                onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                placeholder="Recipe name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Batch Size</label>
              <Input
                type="number"
                value={recipe.batch_size}
                onChange={(e) => setRecipe({ ...recipe, batch_size: Number(e.target.value) })}
                placeholder="Batch size"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <select
                value={recipe.unit}
                onChange={(e) => setRecipe({ ...recipe, unit: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="units">Units</option>
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="pieces">Pieces</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input
              value={recipe.description || ''}
              onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
              placeholder="Recipe description (optional)"
            />
          </div>

          <Button onClick={handleSaveRecipe} disabled={updateRecipeMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateRecipeMutation.isPending ? 'Saving...' : 'Save Recipe'}
          </Button>

          {/* Cost Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Cost Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Recipe Cost:</span>
                <div className="font-medium text-lg">R{totalCost.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600">Cost per {recipe.unit}:</span>
                <div className="font-medium text-lg">R{costPerUnit.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600">Batch Size:</span>
                <div className="font-medium text-lg">{recipe.batch_size} {recipe.unit}</div>
              </div>
            </div>
          </div>

          {/* Ingredients Table */}
          <div>
            <h4 className="font-medium mb-4">Recipe Ingredients</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Cost/Unit</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.map((ingredient) => (
                  <TableRow key={ingredient.id}>
                    <TableCell>
                      {editingIngredient === ingredient.id ? (
                        <Input
                          value={editedIngredient.ingredient_name || ''}
                          onChange={(e) => setEditedIngredient({ ...editedIngredient, ingredient_name: e.target.value })}
                          className="w-full"
                        />
                      ) : (
                        ingredient.ingredient_name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIngredient === ingredient.id ? (
                        <Input
                          type="number"
                          value={editedIngredient.quantity || ''}
                          onChange={(e) => setEditedIngredient({ ...editedIngredient, quantity: Number(e.target.value) })}
                          className="w-20"
                        />
                      ) : (
                        ingredient.quantity
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIngredient === ingredient.id ? (
                        <select
                          value={editedIngredient.unit || ''}
                          onChange={(e) => setEditedIngredient({ ...editedIngredient, unit: e.target.value })}
                          className="w-full p-1 border rounded"
                        >
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="L">L</option>
                          <option value="ml">ml</option>
                          <option value="unit">unit</option>
                        </select>
                      ) : (
                        ingredient.unit
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIngredient === ingredient.id ? (
                        <Input
                          type="number"
                          value={editedIngredient.cost_per_unit || ''}
                          onChange={(e) => setEditedIngredient({ ...editedIngredient, cost_per_unit: Number(e.target.value) })}
                          className="w-24"
                        />
                      ) : (
                        `R${ingredient.cost_per_unit.toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell>R{(ingredient.calculated_cost || (ingredient.cost_per_unit * ingredient.quantity)).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {editingIngredient === ingredient.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSaveIngredient}
                              disabled={updateIngredientMutation.isPending}
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-4 w-4 text-gray-500" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditIngredient(ingredient)}
                            >
                              <Edit className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteIngredientMutation.mutate(ingredient.id)}
                              disabled={deleteIngredientMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Add New Ingredient */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">Add New Ingredient</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ingredient Name</label>
                <Input
                  value={newIngredient.ingredient_name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, ingredient_name: e.target.value })}
                  placeholder="Ingredient name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <Input
                  type="number"
                  value={newIngredient.quantity}
                  onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                  placeholder="Quantity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <select
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="unit">unit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cost per Unit</label>
                <Input
                  type="number"
                  value={newIngredient.cost_per_unit}
                  onChange={(e) => setNewIngredient({ ...newIngredient, cost_per_unit: e.target.value })}
                  placeholder="Cost per unit"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button 
                onClick={handleAddIngredient}
                disabled={addIngredientMutation.isPending || !newIngredient.ingredient_name || !newIngredient.quantity}
              >
                <Plus className="h-4 w-4 mr-2" />
                {addIngredientMutation.isPending ? 'Adding...' : 'Add Ingredient'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecipeEditModal;
