
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Edit, Save, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';

// Types
interface Recipe {
  id: string;
  name: string;
  batch_size: number;
  unit: string;
  description: string | null;
  created_at: string;
}

interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  barcode: string | null;
  created_at: string;
}

const RecipePage = () => {
  const queryClient = useQueryClient();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  
  // Recipe form state
  const [recipeData, setRecipeData] = useState({
    name: '',
    batch_size: '',
    unit: 'kg',
    description: ''
  });
  
  // Ingredient form state
  const [ingredientData, setIngredientData] = useState({
    ingredient_name: '',
    quantity_used: '',
    unit: 'kg',
    total_cost: ''
  });

  // Edit states
  const [editRecipeData, setEditRecipeData] = useState({
    name: '',
    batch_size: '',
    unit: '',
    description: ''
  });

  const [editIngredientData, setEditIngredientData] = useState({
    ingredient_name: '',
    quantity_used: '',
    unit: '',
    total_cost: ''
  });

  // Fetch Recipes
  const { data: recipes = [], isLoading: loadingRecipes } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Recipe[];
    }
  });

  // Fetch Recipe Ingredients
  const { data: recipeIngredients = [] } = useQuery({
    queryKey: ['recipe_ingredients', selectedRecipeId],
    queryFn: async () => {
      if (!selectedRecipeId) return [];
      
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', selectedRecipeId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RecipeIngredient[];
    },
    enabled: !!selectedRecipeId
  });

  // Calculate total batch cost
  const calculateTotalBatchCost = () => {
    return recipeIngredients.reduce((total, ingredient) => {
      return total + (ingredient.quantity * ingredient.cost_per_unit);
    }, 0);
  };

  // Calculate total batch quantity
  const calculateTotalBatchQuantity = () => {
    return recipeIngredients.reduce((total, ingredient) => {
      return total + ingredient.quantity;
    }, 0);
  };

  // Calculate cost per unit based on total ingredients
  const calculateCostPerUnit = () => {
    const totalCost = calculateTotalBatchCost();
    const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);
    if (!selectedRecipe || selectedRecipe.batch_size <= 0) return 0;
    return totalCost / selectedRecipe.batch_size;
  };

  // Create Recipe Mutation
  const createRecipeMutation = useMutation({
    mutationFn: async () => {
      if (!recipeData.name || !recipeData.batch_size) {
        throw new Error('Please fill all required fields');
      }

      const { data, error } = await supabase
        .from('recipes')
        .insert({
          name: recipeData.name,
          batch_size: Number(recipeData.batch_size),
          unit: recipeData.unit,
          description: recipeData.description || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setRecipeData({
        name: '',
        batch_size: '',
        unit: 'kg',
        description: ''
      });
      toast('Recipe created successfully!');
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Update Recipe Mutation
  const updateRecipeMutation = useMutation({
    mutationFn: async ({ recipeId, data }: { recipeId: string, data: any }) => {
      const { error } = await supabase
        .from('recipes')
        .update({
          name: data.name,
          batch_size: Number(data.batch_size),
          unit: data.unit,
          description: data.description || null
        })
        .eq('id', recipeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setEditingRecipeId(null);
      toast('Recipe updated successfully!');
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Delete Recipe Mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      // First delete all ingredients
      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipeId);
      
      if (ingredientsError) throw ingredientsError;

      // Then delete the recipe
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe_ingredients'] });
      setSelectedRecipeId(null);
      toast('Recipe deleted successfully!');
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Add Ingredient Mutation
  const addIngredientMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRecipeId || !ingredientData.ingredient_name || !ingredientData.quantity_used || !ingredientData.total_cost) {
        throw new Error('Please fill all required fields');
      }

      // Calculate cost per unit based on total cost divided by quantity used
      const costPerUnit = Number(ingredientData.total_cost) / Number(ingredientData.quantity_used);

      const { data, error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: selectedRecipeId,
          ingredient_name: ingredientData.ingredient_name,
          quantity: Number(ingredientData.quantity_used),
          unit: ingredientData.unit,
          cost_per_unit: costPerUnit
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe_ingredients'] });
      setIngredientData({
        ingredient_name: '',
        quantity_used: '',
        unit: 'kg',
        total_cost: ''
      });
      toast('Ingredient added successfully!');
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Update Ingredient Mutation
  const updateIngredientMutation = useMutation({
    mutationFn: async ({ ingredientId, data }: { ingredientId: string, data: any }) => {
      // Calculate cost per unit based on total cost divided by quantity used
      const costPerUnit = Number(data.total_cost) / Number(data.quantity_used);

      const { error } = await supabase
        .from('recipe_ingredients')
        .update({
          ingredient_name: data.ingredient_name,
          quantity: Number(data.quantity_used),
          unit: data.unit,
          cost_per_unit: costPerUnit
        })
        .eq('id', ingredientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe_ingredients'] });
      setEditingIngredientId(null);
      toast('Ingredient updated successfully!');
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Delete Ingredient Mutation
  const deleteIngredientMutation = useMutation({
    mutationFn: async (ingredientId: string) => {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', ingredientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe_ingredients'] });
      toast('Ingredient removed successfully!');
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Handle recipe selection
  const handleRecipeSelect = (recipe: Recipe) => {
    setSelectedRecipeId(recipe.id);
    setEditingRecipeId(null);
    setEditingIngredientId(null);
  };

  // Handle edit recipe
  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setEditRecipeData({
      name: recipe.name,
      batch_size: recipe.batch_size.toString(),
      unit: recipe.unit,
      description: recipe.description || ''
    });
  };

  // Handle edit ingredient
  const handleEditIngredient = (ingredient: RecipeIngredient) => {
    setEditingIngredientId(ingredient.id);
    const totalCost = ingredient.quantity * ingredient.cost_per_unit;
    setEditIngredientData({
      ingredient_name: ingredient.ingredient_name,
      quantity_used: ingredient.quantity.toString(),
      unit: ingredient.unit,
      total_cost: totalCost.toFixed(2)
    });
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recipe Management</h1>
        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Recipe System</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Recipe Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Recipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium">Recipe Name</label>
              <Input
                value={recipeData.name}
                onChange={(e) => setRecipeData({...recipeData, name: e.target.value})}
                placeholder="Enter recipe name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Batch Size (final product)</label>
                <Input
                  type="number"
                  value={recipeData.batch_size}
                  onChange={(e) => setRecipeData({...recipeData, batch_size: e.target.value})}
                  placeholder="e.g., 50"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Unit</label>
                <select
                  value={recipeData.unit}
                  onChange={(e) => setRecipeData({...recipeData, unit: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="units">units</option>
                  <option value="loaves">loaves</option>
                  <option value="pieces">pieces</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Description (Optional)</label>
              <Input
                value={recipeData.description}
                onChange={(e) => setRecipeData({...recipeData, description: e.target.value})}
                placeholder="Brief description of the recipe"
              />
            </div>
            
            <Button 
              onClick={() => createRecipeMutation.mutate()}
              disabled={createRecipeMutation.isPending || !recipeData.name || !recipeData.batch_size}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {createRecipeMutation.isPending ? 'Creating...' : 'Create Recipe'}
            </Button>
          </CardContent>
        </Card>

        {/* Recipe List */}
        <Card>
          <CardHeader>
            <CardTitle>Existing Recipes</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRecipes ? (
              <p>Loading recipes...</p>
            ) : recipes.length > 0 ? (
              <div className="space-y-2">
                {recipes.map(recipe => (
                  <div
                    key={recipe.id}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedRecipeId === recipe.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                    }`}
                  >
                    {editingRecipeId === recipe.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editRecipeData.name}
                          onChange={(e) => setEditRecipeData({...editRecipeData, name: e.target.value})}
                          placeholder="Recipe name"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            value={editRecipeData.batch_size}
                            onChange={(e) => setEditRecipeData({...editRecipeData, batch_size: e.target.value})}
                            placeholder="Batch size"
                          />
                          <select
                            value={editRecipeData.unit}
                            onChange={(e) => setEditRecipeData({...editRecipeData, unit: e.target.value})}
                            className="p-2 border rounded"
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="L">L</option>
                            <option value="ml">ml</option>
                            <option value="units">units</option>
                            <option value="loaves">loaves</option>
                            <option value="pieces">pieces</option>
                          </select>
                        </div>
                        <Input
                          value={editRecipeData.description}
                          onChange={(e) => setEditRecipeData({...editRecipeData, description: e.target.value})}
                          placeholder="Description"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateRecipeMutation.mutate({ recipeId: recipe.id, data: editRecipeData })}
                            disabled={updateRecipeMutation.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRecipeId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => handleRecipeSelect(recipe)}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium">{recipe.name}</h4>
                            <p className="text-sm text-gray-600">
                              Batch: {recipe.batch_size} {recipe.unit}
                            </p>
                            {recipe.description && (
                              <p className="text-xs text-gray-500 mt-1">{recipe.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditRecipe(recipe);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this recipe?')) {
                                  deleteRecipeMutation.mutate(recipe.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        {selectedRecipeId === recipe.id && (
                          <div className="mt-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            ✓ Selected for editing
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No recipes created yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recipe Details */}
      {selectedRecipeId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle>Add Ingredient to Recipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Ingredient Name</label>
                <Input
                  value={ingredientData.ingredient_name}
                  onChange={(e) => setIngredientData({...ingredientData, ingredient_name: e.target.value})}
                  placeholder="e.g., Flour, Sugar, Butter"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium">Quantity Used in Batch</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={ingredientData.quantity_used}
                    onChange={(e) => setIngredientData({...ingredientData, quantity_used: e.target.value})}
                    placeholder="e.g., 2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium">Unit</label>
                  <select
                    value={ingredientData.unit}
                    onChange={(e) => setIngredientData({...ingredientData, unit: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="units">units</option>
                    <option value="pieces">pieces</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Total Cost for This Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={ingredientData.total_cost}
                  onChange={(e) => setIngredientData({...ingredientData, total_cost: e.target.value})}
                  placeholder="e.g., 15.50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the total cost for the quantity used in this recipe batch
                </p>
              </div>

              {ingredientData.quantity_used && ingredientData.total_cost && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium">Cost Calculation:</p>
                  <p className="text-sm">
                    Cost per {ingredientData.unit}: R{(Number(ingredientData.total_cost) / Number(ingredientData.quantity_used)).toFixed(2)}
                  </p>
                </div>
              )}
              
              <Button 
                onClick={() => addIngredientMutation.mutate()}
                disabled={addIngredientMutation.isPending || !ingredientData.ingredient_name || !ingredientData.quantity_used || !ingredientData.total_cost}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                {addIngredientMutation.isPending ? 'Adding...' : 'Add Ingredient'}
              </Button>
            </CardContent>
          </Card>

          {/* Recipe Ingredients List */}
          <Card>
            <CardHeader>
              <CardTitle>Recipe Ingredients & Cost Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {recipeIngredients.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingredient</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipeIngredients.map((ingredient) => (
                        <TableRow key={ingredient.id}>
                          <TableCell>
                            {editingIngredientId === ingredient.id ? (
                              <Input
                                value={editIngredientData.ingredient_name}
                                onChange={(e) => setEditIngredientData({...editIngredientData, ingredient_name: e.target.value})}
                                className="w-full"
                              />
                            ) : (
                              ingredient.ingredient_name
                            )}
                          </TableCell>
                          <TableCell>
                            {editingIngredientId === ingredient.id ? (
                              <div className="flex gap-1">
                                <Input
                                  type="number"
                                  value={editIngredientData.quantity_used}
                                  onChange={(e) => setEditIngredientData({...editIngredientData, quantity_used: e.target.value})}
                                  className="w-16"
                                />
                                <select
                                  value={editIngredientData.unit}
                                  onChange={(e) => setEditIngredientData({...editIngredientData, unit: e.target.value})}
                                  className="p-1 border rounded text-xs"
                                >
                                  <option value="kg">kg</option>
                                  <option value="g">g</option>
                                  <option value="L">L</option>
                                  <option value="ml">ml</option>
                                  <option value="units">units</option>
                                  <option value="pieces">pieces</option>
                                </select>
                              </div>
                            ) : (
                              `${ingredient.quantity} ${ingredient.unit}`
                            )}
                          </TableCell>
                          <TableCell>
                            {editingIngredientId === ingredient.id ? (
                              <Input
                                type="number"
                                value={editIngredientData.total_cost}
                                onChange={(e) => setEditIngredientData({...editIngredientData, total_cost: e.target.value})}
                                className="w-20"
                              />
                            ) : (
                              `R${(ingredient.quantity * ingredient.cost_per_unit).toFixed(2)}`
                            )}
                          </TableCell>
                          <TableCell>
                            {editingIngredientId === ingredient.id ? (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => updateIngredientMutation.mutate({ 
                                    ingredientId: ingredient.id, 
                                    data: editIngredientData 
                                  })}
                                  disabled={updateIngredientMutation.isPending}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingIngredientId(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditIngredient(ingredient)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteIngredientMutation.mutate(ingredient.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Cost Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Ingredients Cost</p>
                      <p className="text-lg font-bold">R{calculateTotalBatchCost().toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Recipe Batch Size</p>
                      <p className="text-lg font-bold">
                        {recipes.find(r => r.id === selectedRecipeId)?.batch_size} {recipes.find(r => r.id === selectedRecipeId)?.unit}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Cost per Unit</p>
                      <p className="text-lg font-bold">R{calculateCostPerUnit().toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No ingredients added yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      <Navigation />
    </div>
  );
};

export default RecipePage;
