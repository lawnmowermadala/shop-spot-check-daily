
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Barcode, Plus, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';
import BarcodeScanner from '@/components/BarcodeScanner';

// Types
interface Recipe {
  id: string;
  name: string;
  description: string | null;
  batch_size: number;
  unit: string;
  created_at: string;
}

interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  barcode: string | null;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  created_at: string;
}

const RecipePage = () => {
  const queryClient = useQueryClient();
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);
  const [showNewRecipeForm, setShowNewRecipeForm] = useState(false);
  
  // Recipe form state
  const [recipeData, setRecipeData] = useState({
    name: '',
    description: '',
    batch_size: '',
    unit: 'units'
  });
  
  // Ingredient form state
  const [ingredientData, setIngredientData] = useState({
    ingredient_name: '',
    barcode: '',
    quantity: '',
    unit: 'kg',
    cost_per_unit: ''
  });

  // Fetch Recipes
  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Recipe[];
    }
  });

  // Fetch Ingredients for active recipe
  const { data: recipeIngredients = [] } = useQuery({
    queryKey: ['recipe_ingredients', activeRecipeId],
    queryFn: async () => {
      if (!activeRecipeId) return [];
      
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', activeRecipeId)
        .order('ingredient_name');
      
      if (error) throw error;
      return data as RecipeIngredient[];
    },
    enabled: !!activeRecipeId
  });

  // Add Recipe
  const addRecipe = useMutation({
    mutationFn: async () => {
      if (!recipeData.name || !recipeData.batch_size) {
        throw new Error('Recipe name and batch size are required');
      }

      const { data, error } = await supabase
        .from('recipes')
        .insert({
          name: recipeData.name,
          description: recipeData.description || null,
          batch_size: Number(recipeData.batch_size),
          unit: recipeData.unit
        })
        .select();
      
      if (error) throw error;
      return data[0] as Recipe;
    },
    onSuccess: (recipe) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setRecipeData({
        name: '',
        description: '',
        batch_size: '',
        unit: 'units'
      });
      setShowNewRecipeForm(false);
      setActiveRecipeId(recipe.id);
      toast("Recipe created successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Add Ingredient to Recipe
  const addIngredient = useMutation({
    mutationFn: async () => {
      if (!activeRecipeId || !ingredientData.ingredient_name || !ingredientData.quantity || !ingredientData.cost_per_unit) {
        throw new Error('Please fill all required ingredient fields');
      }

      const { error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: activeRecipeId,
          ingredient_name: ingredientData.ingredient_name,
          barcode: ingredientData.barcode || null,
          quantity: Number(ingredientData.quantity),
          unit: ingredientData.unit,
          cost_per_unit: Number(ingredientData.cost_per_unit)
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe_ingredients', activeRecipeId] });
      setIngredientData({
        ingredient_name: '',
        barcode: '',
        quantity: '',
        unit: 'kg',
        cost_per_unit: ''
      });
      toast("Ingredient added successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Delete Ingredient
  const deleteIngredient = useMutation({
    mutationFn: async (ingredientId: string) => {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', ingredientId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe_ingredients', activeRecipeId] });
      toast("Ingredient removed successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Delete Recipe
  const deleteRecipe = useMutation({
    mutationFn: async (recipeId: string) => {
      // First, delete all ingredients associated with the recipe
      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipeId);
      
      if (ingredientsError) throw ingredientsError;
      
      // Then delete the recipe itself
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setActiveRecipeId(null);
      toast("Recipe deleted successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Calculate total cost of recipe
  const calculateTotalCost = () => {
    return recipeIngredients.reduce((total, ingredient) => {
      return total + (ingredient.quantity * ingredient.cost_per_unit);
    }, 0);
  };

  // Calculate cost per unit
  const calculateCostPerUnit = () => {
    const activeRecipe = recipes.find(recipe => recipe.id === activeRecipeId);
    if (!activeRecipe || activeRecipe.batch_size <= 0) return 0;
    
    return calculateTotalCost() / activeRecipe.batch_size;
  };

  // Handle barcode scan
  const handleBarcodeScan = (barcode: string) => {
    setIngredientData({...ingredientData, barcode});
    setShowBarcodeScanner(false);
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Recipe Management</h1>
        <Button onClick={() => setShowNewRecipeForm(!showNewRecipeForm)}>
          {showNewRecipeForm ? 'Cancel' : 'New Recipe'}
        </Button>
      </div>
      
      {/* New Recipe Form */}
      {showNewRecipeForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Recipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Recipe Name"
                value={recipeData.name}
                onChange={(e) => setRecipeData({...recipeData, name: e.target.value})}
                required
              />
              
              <Input
                placeholder="Description (optional)"
                value={recipeData.description}
                onChange={(e) => setRecipeData({...recipeData, description: e.target.value})}
              />
              
              <Input
                type="number"
                placeholder="Batch Size (how many units this recipe makes)"
                value={recipeData.batch_size}
                onChange={(e) => setRecipeData({...recipeData, batch_size: e.target.value})}
                required
              />
              
              <select
                className="p-2 border rounded"
                value={recipeData.unit}
                onChange={(e) => setRecipeData({...recipeData, unit: e.target.value})}
              >
                <option value="units">units</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
              </select>
            </div>

            <Button 
              onClick={() => addRecipe.mutate()}
              disabled={addRecipe.isPending}
            >
              {addRecipe.isPending ? "Creating..." : "Create Recipe"}
            </Button>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recipes List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Recipes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading recipes...</p>
            ) : recipes.length > 0 ? (
              <div className="space-y-2">
                {recipes.map(recipe => (
                  <div 
                    key={recipe.id}
                    className={`p-3 border rounded-md cursor-pointer ${activeRecipeId === recipe.id ? 'bg-primary/10 border-primary' : 'hover:bg-gray-50'}`}
                    onClick={() => setActiveRecipeId(recipe.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{recipe.name}</h3>
                        <p className="text-sm text-gray-500">
                          {recipe.batch_size} {recipe.unit} per batch
                        </p>
                        {recipe.description && (
                          <p className="text-xs text-gray-500">{recipe.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this recipe?')) {
                            deleteRecipe.mutate(recipe.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No recipes found. Create one to get started!</p>
            )}
          </CardContent>
        </Card>
        
        {/* Active Recipe Details */}
        {activeRecipeId && (
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ingredients for {recipes.find(r => r.id === activeRecipeId)?.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Ingredient Form */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 md:col-span-3">
                    <Input
                      placeholder="Ingredient Name"
                      value={ingredientData.ingredient_name}
                      onChange={(e) => setIngredientData({...ingredientData, ingredient_name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="col-span-10 md:col-span-3 relative">
                    <Input
                      placeholder="Barcode (optional)"
                      value={ingredientData.barcode}
                      onChange={(e) => setIngredientData({...ingredientData, barcode: e.target.value})}
                    />
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowBarcodeScanner(true)}
                    >
                      <Barcode className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="col-span-5 md:col-span-1">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={ingredientData.quantity}
                      onChange={(e) => setIngredientData({...ingredientData, quantity: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="col-span-7 md:col-span-1">
                    <select
                      className="w-full p-2 border rounded"
                      value={ingredientData.unit}
                      onChange={(e) => setIngredientData({...ingredientData, unit: e.target.value})}
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                      <option value="units">units</option>
                    </select>
                  </div>
                  
                  <div className="col-span-12 md:col-span-2">
                    <Input
                      type="number"
                      placeholder="Cost per unit"
                      value={ingredientData.cost_per_unit}
                      onChange={(e) => setIngredientData({...ingredientData, cost_per_unit: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="col-span-12 md:col-span-1">
                    <Button 
                      onClick={() => addIngredient.mutate()}
                      disabled={addIngredient.isPending}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
                
                {/* Barcode Scanner Modal */}
                {showBarcodeScanner && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded-lg max-w-md w-full">
                      <h3 className="text-lg font-medium mb-2">Scan Barcode</h3>
                      <BarcodeScanner onScan={handleBarcodeScan} />
                      <Button 
                        variant="outline" 
                        className="mt-4 w-full" 
                        onClick={() => setShowBarcodeScanner(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Ingredients Table */}
                {recipeIngredients.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingredient</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Cost per Unit</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipeIngredients.map(ingredient => (
                        <TableRow key={ingredient.id}>
                          <TableCell>{ingredient.ingredient_name}</TableCell>
                          <TableCell>{ingredient.barcode || '-'}</TableCell>
                          <TableCell>{ingredient.quantity} {ingredient.unit}</TableCell>
                          <TableCell>${ingredient.cost_per_unit.toFixed(2)}</TableCell>
                          <TableCell>${(ingredient.quantity * ingredient.cost_per_unit).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-700 h-8 w-8"
                              onClick={() => deleteIngredient.mutate(ingredient.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500">No ingredients added yet.</p>
                )}
              </CardContent>
            </Card>
            
            {/* Recipe Cost Summary */}
            {recipeIngredients.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Cost Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 text-center">
                      <h3 className="text-sm font-medium text-gray-500">Total Batch Cost</h3>
                      <p className="text-2xl font-bold">${calculateTotalCost().toFixed(2)}</p>
                    </div>
                    
                    <div className="border rounded-lg p-4 text-center">
                      <h3 className="text-sm font-medium text-gray-500">Cost Per Unit</h3>
                      <p className="text-2xl font-bold">${calculateCostPerUnit().toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        Based on {recipes.find(r => r.id === activeRecipeId)?.batch_size} {recipes.find(r => r.id === activeRecipeId)?.unit} per batch
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      
      <Navigation />
    </div>
  );
};

export default RecipePage;
