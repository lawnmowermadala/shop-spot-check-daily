
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';

// Types
interface ProductionBatch {
  id: string;
  recipe_id: string;
  quantity_produced: number;
  production_date: string;
  staff_name: string;
  notes: string | null;
  created_at: string;
  recipe_name?: string;
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
  calculated_cost: number;
  quantity_used: number | null;
  used_unit: string | null;
}

interface ProductionIngredientUsage {
  id: string;
  production_id: string;
  ingredient_name: string;
  quantity_used: number;
  unit: string;
  cost_per_unit: number;
  created_at: string;
}

const ProductionCostPage = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  
  // Production form state
  const [productionData, setProductionData] = useState({
    recipe_id: '',
    quantity_produced: '',
    staff_name: '',
    notes: ''
  });
  
  // Fetch Recipes
  const { data: recipes = [] } = useQuery({
    queryKey: ['production_recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name, batch_size, unit');
      
      if (error) throw error;
      return data as Recipe[];
    }
  });

  // Fetch Recipe Ingredients with all cost data
  const { data: recipeIngredients = [] } = useQuery({
    queryKey: ['selected_recipe_ingredients', selectedRecipeId],
    queryFn: async () => {
      if (!selectedRecipeId) return [];
      
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', selectedRecipeId);
      
      if (error) throw error;
      return data as RecipeIngredient[];
    },
    enabled: !!selectedRecipeId
  });

  // Fetch Production Batches for selected date
  const { data: productionBatches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ['production_cost_batches', date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!date) return [];
      
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // First fetch the batches
      const { data: batchesData, error: batchesError } = await supabase
        .from('production_cost_batches')
        .select('*')
        .eq('production_date', dateStr)
        .order('created_at', { ascending: false });
      
      if (batchesError) throw batchesError;
      
      // Fetch recipe names separately
      const batches = batchesData as ProductionBatch[];
      const enhancedBatches = await Promise.all(
        batches.map(async (batch) => {
          const { data: recipeData } = await supabase
            .from('recipes')
            .select('name')
            .eq('id', batch.recipe_id)
            .single();
          
          return {
            ...batch,
            recipe_name: recipeData?.name || 'Unknown Recipe'
          };
        })
      );
      
      return enhancedBatches;
    },
    enabled: !!date
  });

  // Fetch Ingredients Usage for active batch
  const { data: batchIngredientUsage = [] } = useQuery({
    queryKey: ['production_ingredient_usage', activeBatchId],
    queryFn: async () => {
      if (!activeBatchId) return [];
      
      const { data, error } = await supabase
        .from('production_ingredient_usage')
        .select('*')
        .eq('production_id', activeBatchId)
        .order('ingredient_name');
      
      if (error) throw error;
      return data as ProductionIngredientUsage[];
    },
    enabled: !!activeBatchId
  });

  // Calculate total recipe cost
  const calculateRecipeTotalCost = () => {
    return recipeIngredients.reduce((total, ingredient) => {
      return total + (ingredient.calculated_cost || 0);
    }, 0);
  };

  // Calculate scaled ingredients and costs for production quantity
  const calculateIngredientsNeeded = () => {
    if (!selectedRecipeId || !productionData.quantity_produced) return [];
    
    const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);
    if (!selectedRecipe || selectedRecipe.batch_size <= 0) return [];
    
    const scalingFactor = Number(productionData.quantity_produced) / selectedRecipe.batch_size;
    
    return recipeIngredients.map(ingredient => ({
      ...ingredient,
      scaled_quantity: (ingredient.quantity_used || ingredient.quantity || 0) * scalingFactor,
      scaled_cost: (ingredient.calculated_cost || 0) * scalingFactor
    }));
  };

  // Calculate total production cost
  const calculateTotalProductionCost = () => {
    const ingredientsNeeded = calculateIngredientsNeeded();
    return ingredientsNeeded.reduce((sum, ingredient) => sum + ingredient.scaled_cost, 0);
  };

  // Calculate cost per unit
  const calculateCostPerUnit = () => {
    const totalCost = calculateTotalProductionCost();
    const quantity = Number(productionData.quantity_produced);
    return quantity > 0 ? totalCost / quantity : 0;
  };

  // Add Production Batch
  const addProductionBatch = useMutation({
    mutationFn: async () => {
      if (!date || !productionData.recipe_id || !productionData.quantity_produced || !productionData.staff_name) {
        throw new Error('Please fill all required fields');
      }

      // Calculate costs
      const totalCost = calculateTotalProductionCost();
      const costPerUnit = calculateCostPerUnit();

      // Insert production batch
      const { data, error } = await supabase
        .from('production_cost_batches')
        .insert({
          recipe_id: productionData.recipe_id,
          quantity_produced: Number(productionData.quantity_produced),
          production_date: format(date, 'yyyy-MM-dd'),
          staff_name: productionData.staff_name,
          notes: productionData.notes || null
        })
        .select();
      
      if (error) throw error;
      
      const batchId = data[0].id;
      
      // Insert ingredient usage records based on scaled recipe ingredients
      const ingredientsNeeded = calculateIngredientsNeeded();
      const ingredientUsages = ingredientsNeeded.map(ingredient => ({
        production_id: batchId,
        ingredient_name: ingredient.ingredient_name,
        quantity_used: ingredient.scaled_quantity,
        unit: ingredient.used_unit || ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit
      }));
      
      const { error: usageError } = await supabase
        .from('production_ingredient_usage')
        .insert(ingredientUsages);
      
      if (usageError) throw usageError;
      
      return data[0] as ProductionBatch;
    },
    onSuccess: (batch) => {
      queryClient.invalidateQueries({ queryKey: ['production_cost_batches'] });
      setProductionData({
        recipe_id: '',
        quantity_produced: '',
        staff_name: '',
        notes: ''
      });
      setSelectedRecipeId(null);
      setActiveBatchId(batch.id);
      toast("Production batch created successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Delete Production Batch
  const deleteProductionBatch = useMutation({
    mutationFn: async (batchId: string) => {
      // First, delete all ingredient usages
      const { error: usageError } = await supabase
        .from('production_ingredient_usage')
        .delete()
        .eq('production_id', batchId);
      
      if (usageError) throw usageError;
      
      // Then delete the production batch
      const { error } = await supabase
        .from('production_cost_batches')
        .delete()
        .eq('id', batchId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_cost_batches'] });
      setActiveBatchId(null);
      toast("Production batch deleted successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Calculate total cost of ingredients for a batch
  const calculateBatchTotalCost = (batchId: string) => {
    if (batchId !== activeBatchId || !batchIngredientUsage.length) return 0;
    
    return batchIngredientUsage.reduce((total, usage) => {
      return total + (usage.quantity_used * usage.cost_per_unit);
    }, 0);
  };

  // Calculate cost per unit for a batch
  const calculateBatchUnitCost = (batchId: string, quantityProduced: number) => {
    if (batchId !== activeBatchId || !batchIngredientUsage.length || quantityProduced <= 0) return 0;
    
    const totalCost = calculateBatchTotalCost(batchId);
    return totalCost / quantityProduced;
  };

  // Handle recipe selection
  const handleRecipeSelection = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setProductionData({...productionData, recipe_id: recipeId});
  };

  // Handle quantity change and calculate ingredients needed
  const handleQuantityChange = (quantity: string) => {
    setProductionData({...productionData, quantity_produced: quantity});
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Production Cost Tracking</h1>
        
        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Production Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create Production Batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recipe Selection */}
            <div>
              <label className="block mb-2 text-sm font-medium">Select Recipe</label>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                {recipes.map(recipe => (
                  <div
                    key={recipe.id}
                    className={`p-2 border rounded cursor-pointer ${selectedRecipeId === recipe.id ? 'bg-primary/10 border-primary' : 'hover:bg-gray-50'}`}
                    onClick={() => handleRecipeSelection(recipe.id)}
                  >
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-medium">{recipe.name}</h4>
                        <p className="text-xs text-gray-500">Standard batch: {recipe.batch_size} {recipe.unit}</p>
                      </div>
                      {selectedRecipeId === recipe.id && (
                        <div className="text-primary font-bold">✓</div>
                      )}
                    </div>
                  </div>
                ))}
                {recipes.length === 0 && (
                  <p className="text-gray-500 text-sm p-2">No recipes available. Please create recipes first.</p>
                )}
              </div>
            </div>
            
            {/* Form Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Quantity Produced</label>
                <Input
                  type="number"
                  value={productionData.quantity_produced}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder="How many units produced"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Staff Name</label>
                <Input
                  value={productionData.staff_name}
                  onChange={(e) => setProductionData({...productionData, staff_name: e.target.value})}
                  placeholder="Who produced this batch"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Notes (Optional)</label>
                <Input
                  value={productionData.notes}
                  onChange={(e) => setProductionData({...productionData, notes: e.target.value})}
                  placeholder="Any notes about this production"
                />
              </div>
            </div>
          </div>
          
          {/* Calculated Ingredients Table */}
          {selectedRecipeId && productionData.quantity_produced && (
            <div>
              <h3 className="font-medium my-2">Scaled Ingredients for Production:</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Recipe Quantity</TableHead>
                    <TableHead>Scaled Quantity</TableHead>
                    <TableHead>Cost per Unit</TableHead>
                    <TableHead>Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculateIngredientsNeeded().map((ingredient, index) => (
                    <TableRow key={index}>
                      <TableCell>{ingredient.ingredient_name}</TableCell>
                      <TableCell>{ingredient.quantity_used || ingredient.quantity || 0} {ingredient.used_unit || ingredient.unit}</TableCell>
                      <TableCell>{ingredient.scaled_quantity.toFixed(2)} {ingredient.used_unit || ingredient.unit}</TableCell>
                      <TableCell>R{ingredient.cost_per_unit.toFixed(2)}</TableCell>
                      <TableCell>R{ingredient.scaled_cost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-md flex justify-between items-center">
                <div>
                  <span className="font-medium">Total Production Cost: </span>
                  <span className="text-lg font-bold">
                    R{calculateTotalProductionCost().toFixed(2)}
                  </span>
                </div>
                
                <div>
                  <span className="font-medium">Cost Per Unit: </span>
                  <span className="text-lg font-bold">
                    R{calculateCostPerUnit().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <Button 
            onClick={() => addProductionBatch.mutate()}
            disabled={addProductionBatch.isPending || !selectedRecipeId || !productionData.quantity_produced || !productionData.staff_name}
            className="mt-4"
          >
            {addProductionBatch.isPending ? "Creating..." : "Create Production Batch"}
          </Button>
        </CardContent>
      </Card>
      
      {/* Daily Production Batches */}
      <Card>
        <CardHeader>
          <CardTitle>
            Production Batches for {date && format(date, 'MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBatches ? (
            <p>Loading batches...</p>
          ) : productionBatches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionBatches.map(batch => (
                  <TableRow 
                    key={batch.id} 
                    className={activeBatchId === batch.id ? 'bg-gray-50' : ''}
                  >
                    <TableCell>{batch.recipe_name}</TableCell>
                    <TableCell>{batch.quantity_produced}</TableCell>
                    <TableCell>{batch.staff_name}</TableCell>
                    <TableCell>{new Date(batch.created_at).toLocaleTimeString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveBatchId(activeBatchId === batch.id ? null : batch.id)}
                        >
                          {activeBatchId === batch.id ? 'Hide Details' : 'View Details'}
                        </Button>
                        
                        <Button 
                          variant="ghost"
                          size="icon" 
                          className="text-red-500 hover:text-red-700 h-8 w-8"
                          onClick={() => {
                            if(confirm('Are you sure you want to delete this production batch?')) {
                              deleteProductionBatch.mutate(batch.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500">No production batches for this date</p>
          )}
        </CardContent>
      </Card>
      
      {/* Selected Batch Details */}
      {activeBatchId && (
        <Card>
          <CardHeader>
            <CardTitle>Production Batch Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ingredients Used Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Quantity Used</TableHead>
                  <TableHead>Cost per Unit</TableHead>
                  <TableHead>Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchIngredientUsage.map(usage => (
                  <TableRow key={usage.id}>
                    <TableCell>{usage.ingredient_name}</TableCell>
                    <TableCell>{usage.quantity_used} {usage.unit}</TableCell>
                    <TableCell>R{usage.cost_per_unit.toFixed(2)}</TableCell>
                    <TableCell>R{(usage.quantity_used * usage.cost_per_unit).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Cost Summary */}
            {batchIngredientUsage.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <h3 className="text-sm font-medium text-gray-500">Total Production Cost</h3>
                  <p className="text-3xl font-bold">
                    R{calculateBatchTotalCost(activeBatchId).toFixed(2)}
                  </p>
                </div>
                
                <div className="border rounded-lg p-4 text-center">
                  <h3 className="text-sm font-medium text-gray-500">Cost Per Unit</h3>
                  <p className="text-3xl font-bold">
                    R{calculateBatchUnitCost(
                      activeBatchId, 
                      productionBatches.find(b => b.id === activeBatchId)?.quantity_produced || 0
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <Navigation />
    </div>
  );
};

export default ProductionCostPage;
