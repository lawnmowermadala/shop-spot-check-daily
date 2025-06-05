import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

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
  pack_size: number | null;
  pack_price: number | null;
  pack_unit: string | null;
  quantity_used: number | null;
  used_unit: string | null;
  calculated_cost: number | null;
  barcode: string | null;
  created_at: string;
}

interface ProductionBatch {
  id: string;
  recipe_id: string;
  staff_name: string;
  production_date: string;
  quantity_produced: number;
  notes: string | null;
  created_at: string;
}

interface IngredientUsage {
  id: string;
  production_id: string;
  ingredient_name: string;
  quantity_used: number;
  unit: string;
  cost_per_unit: number;
  created_at: string;
}

const ProductionCostPage = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [staffName, setStaffName] = useState('');
  const [productionDate, setProductionDate] = useState('');
  const [quantityProduced, setQuantityProduced] = useState('');
  const [notes, setNotes] = useState('');
  const [ingredientUsages, setIngredientUsages] = useState<IngredientUsage[]>([]);
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecipes();
    fetchProductionBatches();
  }, []);

  const fetchRecipes = async () => {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching recipes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch recipes",
        variant: "destructive",
      });
    } else {
      setRecipes(data || []);
    }
  };

  const fetchProductionBatches = async () => {
    const { data, error } = await supabase
      .from('production_cost_batches')
      .select('*')
      .order('production_date', { ascending: false });

    if (error) {
      console.error('Error fetching production batches:', error);
      toast({
        title: "Error",
        description: "Failed to fetch production batches",
        variant: "destructive",
      });
    } else {
      setProductionBatches(data || []);
    }
  };

  const fetchRecipeIngredients = async (recipeId: string) => {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipeId);

    if (error) {
      console.error('Error fetching recipe ingredients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch recipe ingredients",
        variant: "destructive",
      });
    } else {
      setRecipeIngredients(data as RecipeIngredient[] || []);
      
      // Initialize ingredient usages based on recipe ingredients
      const usages = (data || []).map((ingredient: any) => ({
        id: crypto.randomUUID(),
        production_id: '',
        ingredient_name: ingredient.ingredient_name,
        quantity_used: ingredient.quantity_used || ingredient.quantity || 0,
        unit: ingredient.used_unit || ingredient.unit || 'g',
        cost_per_unit: ingredient.cost_per_unit || 0,
        created_at: new Date().toISOString(),
      }));
      setIngredientUsages(usages);
    }
  };

  const handleRecipeChange = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    if (recipeId) {
      fetchRecipeIngredients(recipeId);
    } else {
      setRecipeIngredients([]);
      setIngredientUsages([]);
    }
  };

  const updateIngredientUsage = (index: number, field: string, value: any) => {
    const updatedUsages = [...ingredientUsages];
    updatedUsages[index] = { ...updatedUsages[index], [field]: value };
    setIngredientUsages(updatedUsages);
  };

  const addIngredientUsage = () => {
    const newUsage: IngredientUsage = {
      id: crypto.randomUUID(),
      production_id: '',
      ingredient_name: '',
      quantity_used: 0,
      unit: 'g',
      cost_per_unit: 0,
      created_at: new Date().toISOString(),
    };
    setIngredientUsages([...ingredientUsages, newUsage]);
  };

  const removeIngredientUsage = (index: number) => {
    const updatedUsages = ingredientUsages.filter((_, i) => i !== index);
    setIngredientUsages(updatedUsages);
  };

  const calculateTotalCost = () => {
    return ingredientUsages.reduce((total, usage) => {
      return total + (usage.quantity_used * usage.cost_per_unit);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRecipeId || !staffName || !productionDate || !quantityProduced) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create production batch
      const { data: batchData, error: batchError } = await supabase
        .from('production_cost_batches')
        .insert({
          recipe_id: selectedRecipeId,
          staff_name: staffName,
          production_date: productionDate,
          quantity_produced: parseFloat(quantityProduced),
          notes: notes || null,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Create ingredient usage records
      const usageRecords = ingredientUsages.map(usage => ({
        production_id: batchData.id,
        ingredient_name: usage.ingredient_name,
        quantity_used: usage.quantity_used,
        unit: usage.unit,
        cost_per_unit: usage.cost_per_unit,
      }));

      const { error: usageError } = await supabase
        .from('production_ingredient_usage')
        .insert(usageRecords);

      if (usageError) throw usageError;

      toast({
        title: "Success",
        description: "Production batch recorded successfully",
      });

      // Reset form
      setSelectedRecipeId('');
      setStaffName('');
      setProductionDate('');
      setQuantityProduced('');
      setNotes('');
      setRecipeIngredients([]);
      setIngredientUsages([]);
      
      // Refresh production batches
      fetchProductionBatches();
    } catch (error) {
      console.error('Error saving production batch:', error);
      toast({
        title: "Error",
        description: "Failed to save production batch",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Production Cost Tracking</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Form */}
        <Card>
          <CardHeader>
            <CardTitle>Record Production Batch</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="recipe">Recipe</Label>
                <Select value={selectedRecipeId} onValueChange={handleRecipeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a recipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name} ({recipe.batch_size} {recipe.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="staff">Staff Name</Label>
                <Input
                  id="staff"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Enter staff name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="date">Production Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={productionDate}
                  onChange={(e) => setProductionDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="quantity">Quantity Produced</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={quantityProduced}
                  onChange={(e) => setQuantityProduced(e.target.value)}
                  placeholder="Enter quantity produced"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any notes about this batch"
                />
              </div>

              {/* Ingredient Usage Section */}
              {selectedRecipeId && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Ingredient Usage</Label>
                    <Button type="button" onClick={addIngredientUsage} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Ingredient
                    </Button>
                  </div>

                  {ingredientUsages.map((usage, index) => (
                    <div key={usage.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Input
                          value={usage.ingredient_name}
                          onChange={(e) => updateIngredientUsage(index, 'ingredient_name', e.target.value)}
                          placeholder="Ingredient name"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={usage.quantity_used}
                          onChange={(e) => updateIngredientUsage(index, 'quantity_used', parseFloat(e.target.value) || 0)}
                          placeholder="Qty"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          value={usage.unit}
                          onChange={(e) => updateIngredientUsage(index, 'unit', e.target.value)}
                          placeholder="Unit"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={usage.cost_per_unit}
                          onChange={(e) => updateIngredientUsage(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                          placeholder="Cost per unit"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeIngredientUsage(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="text-right font-semibold">
                    Total Cost: R{calculateTotalCost().toFixed(2)}
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full">
                Record Production Batch
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Production History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Production Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {productionBatches.map((batch) => (
                <div key={batch.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{batch.staff_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(batch.production_date).toLocaleDateString()}
                      </div>
                      <div className="text-sm">
                        Quantity: {batch.quantity_produced}
                      </div>
                      {batch.notes && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {batch.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductionCostPage;
