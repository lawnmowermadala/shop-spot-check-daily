
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  quantity: number;
  unit: string;
  cost_per_unit: number;
  pack_size: number | null;
  pack_unit: string | null;
  pack_price: number | null;
  quantity_used: number | null;
  used_unit: string | null;
  calculated_cost: number | null;
}

interface Ingredient {
  id: string;
  name: string;
  weight: number;
  unit: string;
  price_ex_vat: number;
  total_price: number;
}

const RecipePage = () => {
  const queryClient = useQueryClient();
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);

  // Recipe form state
  const [recipeData, setRecipeData] = useState({
    name: '',
    description: '',
    batch_size: '',
    unit: 'units'
  });

  // Ingredient form state
  const [ingredientData, setIngredientData] = useState({
    ingredient_id: '', // NEW: store ingredient ID
    ingredient_name: '',
    pack_size: '',
    pack_unit: 'kg',
    pack_price: '',
    quantity_used: '',
    used_unit: 'g'
  });

  // Edit states
  const [editIngredientData, setEditIngredientData] = useState({
    ingredient_id: '', // NEW: store ingredient ID for edit
    ingredient_name: '',
    pack_size: '',
    pack_unit: '',
    pack_price: '',
    quantity_used: '',
    used_unit: ''
  });

  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');

  // Fetch all ingredients from the ingredients table
  const { data: availableIngredients = [] } = useQuery({
    queryKey: ['available-ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Ingredient[];
    }
  });

  // Fetch Recipes
  const { data: recipes = [], isLoading: recipesLoading } = useQuery({
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

  // Fetch Recipe Ingredients
  const { data: recipeIngredients = [], isLoading: ingredientsLoading } = useQuery({
    queryKey: ['recipe-ingredients', selectedRecipeId],
    queryFn: async () => {
      if (!selectedRecipeId) return [];
      
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', selectedRecipeId)
        .order('ingredient_name');
      
      if (error) throw error;
      return data as RecipeIngredient[];
    },
    enabled: !!selectedRecipeId
  });

  // Handle ingredient selection from dropdown
  const handleIngredientSelect = (ingredientId: string) => {
    const selectedIngredient = availableIngredients.find(ing => ing.id === ingredientId);
    if (selectedIngredient) {
      setIngredientData({
        ingredient_id: selectedIngredient.id,
        ingredient_name: selectedIngredient.name,
        pack_size: selectedIngredient.weight.toString(),
        pack_unit: selectedIngredient.unit,
        pack_price: selectedIngredient.total_price.toString(),
        quantity_used: '',
        used_unit: 'g'
      });
    } else {
      // Clear form for manual entry
      setIngredientData({
        ingredient_id: '',
        ingredient_name: '',
        pack_size: '',
        pack_unit: 'kg',
        pack_price: '',
        quantity_used: '',
        used_unit: 'g'
      });
    }
  };

  // Calculate cost per unit based on pack size and price
  const calculateCostPerUnit = (packPrice: string, packSize: string, packUnit: string, usedUnit: string) => {
    const price = Number(packPrice);
    const size = Number(packSize);
    
    if (!price || !size) return 0;

    let conversionFactor = 1;
    
    // Convert pack unit to used unit
    if (packUnit === 'kg' && usedUnit === 'g') {
      conversionFactor = 1000;
    } else if (packUnit === 'l' && usedUnit === 'ml') {
      conversionFactor = 1000;
    } else if (packUnit === 'g' && usedUnit === 'kg') {
      conversionFactor = 0.001;
    } else if (packUnit === 'ml' && usedUnit === 'l') {
      conversionFactor = 0.001;
    }
    
    return price / (size * conversionFactor);
  };

  // Add Recipe
  const addRecipe = useMutation({
    mutationFn: async () => {
      if (!recipeData.name || !recipeData.batch_size) {
        throw new Error('Please fill all required fields');
      }

      const { data, error } = await supabase
        .from('recipes')
        .insert({
          name: recipeData.name,
          description: recipeData.description || null,
          batch_size: Number(recipeData.batch_size),
          unit: recipeData.unit
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setRecipeData({ name: '', description: '', batch_size: '', unit: 'units' });
      setSelectedRecipeId(data.id);
      toast("Recipe added successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Add Recipe Ingredient
  const addIngredient = useMutation({
    mutationFn: async () => {
      if (!selectedRecipeId || !ingredientData.ingredient_name || !ingredientData.quantity_used) {
        throw new Error('Please select a recipe and fill all required fields');
      }

      const costPerUnit = calculateCostPerUnit(
        ingredientData.pack_price,
        ingredientData.pack_size,
        ingredientData.pack_unit,
        ingredientData.used_unit
      );
      
      const quantityUsed = Number(ingredientData.quantity_used);
      const calculatedCost = costPerUnit * quantityUsed;

      const { error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: selectedRecipeId,
          ingredient_name: ingredientData.ingredient_name,
          quantity: quantityUsed,
          unit: ingredientData.used_unit,
          cost_per_unit: costPerUnit,
          pack_size: Number(ingredientData.pack_size) || null,
          pack_unit: ingredientData.pack_unit || null,
          pack_price: Number(ingredientData.pack_price) || null,
          quantity_used: quantityUsed,
          used_unit: ingredientData.used_unit,
          calculated_cost: calculatedCost
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-ingredients'] });
      setIngredientData({
        ingredient_id: '',
        ingredient_name: '',
        pack_size: '',
        pack_unit: 'kg',
        pack_price: '',
        quantity_used: '',
        used_unit: 'g'
      });
      toast("Ingredient added successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Delete Recipe Ingredient
  const deleteIngredient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-ingredients'] });
      toast("Ingredient removed successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Calculate total recipe cost
  const totalRecipeCost = recipeIngredients.reduce((sum, ingredient) => 
    sum + (ingredient.calculated_cost || 0), 0
  );

  const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);
  const costPerUnit = selectedRecipe ? totalRecipeCost / selectedRecipe.batch_size : 0;

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <h1 className="text-2xl font-bold">Recipe Management</h1>
      
      {/* Add Recipe Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Recipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium">Recipe Name *</label>
              <Input
                value={recipeData.name}
                onChange={(e) => setRecipeData({...recipeData, name: e.target.value})}
                placeholder="Enter recipe name"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Batch Size *</label>
              <Input
                type="number"
                step="0.01"
                value={recipeData.batch_size}
                onChange={(e) => setRecipeData({...recipeData, batch_size: e.target.value})}
                placeholder="Enter batch size"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Unit</label>
              <select 
                className="w-full p-2 border rounded-md bg-white"
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
            
            <div>
              <label className="block mb-1 text-sm font-medium">Description</label>
              <Input
                value={recipeData.description}
                onChange={(e) => setRecipeData({...recipeData, description: e.target.value})}
                placeholder="Recipe description (optional)"
              />
            </div>
          </div>
          
          <Button 
            onClick={() => addRecipe.mutate()}
            disabled={addRecipe.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {addRecipe.isPending ? "Adding..." : "Add Recipe"}
          </Button>
        </CardContent>
      </Card>

      {/* Recipe Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Recipe to Manage</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a recipe to add ingredients" />
            </SelectTrigger>
            <SelectContent>
              {recipes.map(recipe => (
                <SelectItem key={recipe.id} value={recipe.id}>
                  {recipe.name} (Batch: {recipe.batch_size} {recipe.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Add Ingredients Form */}
      {selectedRecipeId && (
        <Card>
          <CardHeader>
            <CardTitle>Add Ingredient to Recipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ingredient Selection Dropdown */}
            <div>
              <label className="block mb-1 text-sm font-medium">Select from Available Ingredients (Optional)</label>
              <Select 
                value={ingredientData.ingredient_id} 
                onValueChange={handleIngredientSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an existing ingredient or leave blank for manual entry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Manual Entry</SelectItem>
                  {availableIngredients.map(ingredient => (
                    <SelectItem key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} ({ingredient.weight} {ingredient.unit} - R{ingredient.total_price.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Ingredient Name *</label>
                <Input
                  value={ingredientData.ingredient_name}
                  onChange={(e) => setIngredientData({...ingredientData, ingredient_name: e.target.value})}
                  placeholder="Enter ingredient name"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Pack Size *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={ingredientData.pack_size}
                  onChange={(e) => setIngredientData({...ingredientData, pack_size: e.target.value})}
                  placeholder="Enter pack size"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Pack Unit</label>
                <select 
                  className="w-full p-2 border rounded-md bg-white"
                  value={ingredientData.pack_unit}
                  onChange={(e) => setIngredientData({...ingredientData, pack_unit: e.target.value})}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="l">l</option>
                  <option value="ml">ml</option>
                  <option value="units">units</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Pack Price *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={ingredientData.pack_price}
                  onChange={(e) => setIngredientData({...ingredientData, pack_price: e.target.value})}
                  placeholder="Enter pack price"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Quantity Used *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={ingredientData.quantity_used}
                  onChange={(e) => setIngredientData({...ingredientData, quantity_used: e.target.value})}
                  placeholder="Enter quantity used"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Used Unit</label>
                <select 
                  className="w-full p-2 border rounded-md bg-white"
                  value={ingredientData.used_unit}
                  onChange={(e) => setIngredientData({...ingredientData, used_unit: e.target.value})}
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="units">units</option>
                </select>
              </div>
            </div>
            
            {/* Cost Preview */}
            {ingredientData.pack_price && ingredientData.pack_size && ingredientData.quantity_used && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600 font-medium mb-1">Cost Preview:</p>
                <p className="text-sm">
                  Cost per {ingredientData.used_unit}: R{calculateCostPerUnit(
                    ingredientData.pack_price,
                    ingredientData.pack_size,
                    ingredientData.pack_unit,
                    ingredientData.used_unit
                  ).toFixed(4)}
                </p>
                <p className="text-sm font-bold text-green-600">
                  Total Cost: R{(calculateCostPerUnit(
                    ingredientData.pack_price,
                    ingredientData.pack_size,
                    ingredientData.pack_unit,
                    ingredientData.used_unit
                  ) * Number(ingredientData.quantity_used)).toFixed(2)}
                </p>
              </div>
            )}
            
            <Button 
              onClick={() => addIngredient.mutate()}
              disabled={addIngredient.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {addIngredient.isPending ? "Adding..." : "Add Ingredient"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recipe Ingredients List */}
      {selectedRecipeId && (
        <Card>
          <CardHeader>
            <CardTitle>
              Recipe Ingredients 
              {selectedRecipe && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  - {selectedRecipe.name} (Total Cost: R{totalRecipeCost.toFixed(2)} | Cost per {selectedRecipe.unit}: R{costPerUnit.toFixed(2)})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ingredientsLoading ? (
              <div className="text-center py-4">Loading ingredients...</div>
            ) : recipeIngredients.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Quantity Used</TableHead>
                      <TableHead>Pack Info</TableHead>
                      <TableHead>Cost per Unit</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipeIngredients.map(ingredient => (
                      <TableRow key={ingredient.id}>
                        <TableCell className="font-medium">{ingredient.ingredient_name}</TableCell>
                        <TableCell>{ingredient.quantity_used} {ingredient.used_unit}</TableCell>
                        <TableCell>
                          {ingredient.pack_size} {ingredient.pack_unit} @ R{ingredient.pack_price?.toFixed(2)}
                        </TableCell>
                        <TableCell>R{ingredient.cost_per_unit.toFixed(4)}</TableCell>
                        <TableCell className="font-bold text-green-600">
                          R{ingredient.calculated_cost?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost"
                            size="icon" 
                            className="text-red-500 hover:text-red-700 h-8 w-8"
                            onClick={() => {
                              if(confirm('Are you sure you want to remove this ingredient?')) {
                                deleteIngredient.mutate(ingredient.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No ingredients added to this recipe yet.</p>
                <p className="text-sm">Add ingredients using the form above.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recipes List */}
      <Card>
        <CardHeader>
          <CardTitle>All Recipes ({recipes.length} recipes)</CardTitle>
        </CardHeader>
        <CardContent>
          {recipesLoading ? (
            <div className="text-center py-4">Loading recipes...</div>
          ) : recipes.length > 0 ? (
            <div className="grid gap-4">
              {recipes.map(recipe => (
                <div key={recipe.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{recipe.name}</h3>
                      <p className="text-gray-600">{recipe.description}</p>
                      <p className="text-sm text-gray-500">
                        Batch Size: {recipe.batch_size} {recipe.unit}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedRecipeId(recipe.id)}
                      className="ml-4"
                    >
                      {selectedRecipeId === recipe.id ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No recipes found.</p>
              <p className="text-sm">Add your first recipe using the form above.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default RecipePage;
