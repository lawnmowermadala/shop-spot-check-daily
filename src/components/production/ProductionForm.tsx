import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { Loader2, CheckCircle } from 'lucide-react';

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

interface StaffMember {
  id: number;
  name: string;
}

interface ProductionFormProps {
  products: Product[];
  recipes: Recipe[];
  staffMembers: StaffMember[];
  recipeIngredients: RecipeIngredient[];
  date: Date;
  onBatchCreated: () => void;
  onRecipeSelected: (recipeId: string | null) => void;
}

const ProductionForm = ({
  products,
  recipes,
  staffMembers,
  recipeIngredients,
  date,
  onBatchCreated,
  onRecipeSelected
}: ProductionFormProps) => {
  const [fetchingDefaultRecipe, setFetchingDefaultRecipe] = useState(false);
  const [autoSelectedRecipe, setAutoSelectedRecipe] = useState(false);
  const [productRecipes, setProductRecipes] = useState<{product_id: string, recipe_id: string}[]>([]);
  const [fetchingProductRecipes, setFetchingProductRecipes] = useState(false);
  const [productionData, setProductionData] = useState({
    product_id: '',
    recipe_id: '',
    quantity_produced: '',
    staff_id: '',
    notes: ''
  });

  // Fetch product-recipes relationships
  useEffect(() => {
    const fetchProductRecipes = async () => {
      setFetchingProductRecipes(true);
      try {
        const { data, error } = await supabase
          .from('product_recipes')
          .select('product_id, recipe_id');
        
        if (error) {
          console.error('Error fetching product recipes:', error);
        } else {
          setProductRecipes(data || []);
        }
      } catch (error) {
        console.error('Error fetching product recipes:', error);
      } finally {
        setFetchingProductRecipes(false);
      }
    };

    fetchProductRecipes();
  }, []);

  // Update parent component when recipe changes
  useEffect(() => {
    onRecipeSelected(productionData.recipe_id || null);
  }, [productionData.recipe_id, onRecipeSelected]);

  const handleProductChange = async (productId: string) => {
    console.log('PRODUCT CHANGED TO:', productId);
    console.log('handleProductChange called with:', productId);
    
    // Reset recipe selection and auto-selected flag when product changes
    setProductionData(prev => {
      console.log('🔵 Resetting recipe_id, prev state:', prev);
      return {...prev, product_id: productId, recipe_id: ''};
    });
    setAutoSelectedRecipe(false);
    
    if (!productId) {
      console.log('🔵 No product selected, returning');
      return;
    }
    
    setFetchingDefaultRecipe(true);
    console.log('🔵 Fetching default recipe for product:', productId);
    
    try {
      // First, check if there's a default recipe for this product in product_recipes table
      const { data: defaultRecipe, error: defaultRecipeError } = await supabase
        .from('product_recipes')
        .select('recipe_id, recipes(name)')
        .eq('product_id', productId)
        .eq('is_default', true)
        .maybeSingle();

      console.log('🔵 Default recipe query result:', { defaultRecipe, defaultRecipeError });

      if (defaultRecipe && defaultRecipe.recipe_id) {
        console.log('🟢 Found default recipe:', defaultRecipe.recipe_id);
        setProductionData(prev => {
          console.log('🟢 Setting default recipe, prev:', prev);
          return {...prev, recipe_id: defaultRecipe.recipe_id};
        });
        setAutoSelectedRecipe(true);
        toast.success('Default recipe auto-selected');
        setFetchingDefaultRecipe(false);
        return;
      }

      // If no default recipe, fall back to most frequently used recipe
      console.log('🔵 No default recipe, checking production batches...');
      const { data: batches, error } = await supabase
        .from('production_batches')
        .select('recipe_id, recipes(name)')
        .eq('product_id', productId)
        .not('recipe_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('🔴 Error fetching production batches:', error);
        setFetchingDefaultRecipe(false);
        return;
      }

      console.log('🔵 Found batches:', batches?.length, batches);

      if (batches && batches.length > 0) {
        const recipeCounts = batches.reduce((acc: Record<string, number>, batch) => {
          if (batch.recipe_id) {
            acc[batch.recipe_id] = (acc[batch.recipe_id] || 0) + 1;
          }
          return acc;
        }, {});

        console.log('🔵 Recipe counts:', recipeCounts);

        const mostUsedRecipeId = Object.entries(recipeCounts)
          .sort(([,a], [,b]) => b - a)[0][0];

        console.log('🟢 Most used recipe ID:', mostUsedRecipeId);
        
        setProductionData(prev => {
          console.log('🟢 Setting most-used recipe, prev:', prev);
          return {...prev, recipe_id: mostUsedRecipeId};
        });
        setAutoSelectedRecipe(true);
        toast.success('Recipe auto-selected based on history');
      } else {
        console.log('🟡 No previous batches found for this product');
      }
      
      setFetchingDefaultRecipe(false);
    } catch (error) {
      console.error('🔴 Error in handleProductChange:', error);
      setFetchingDefaultRecipe(false);
    }
  };

  const handleRecipeChange = (recipeId: string) => {
    setProductionData({...productionData, recipe_id: recipeId});
    setAutoSelectedRecipe(false); // User manually changed the recipe
  };

  // Get recipes associated with the selected product
  const getAvailableRecipes = () => {
    if (!productionData.product_id) {
      // If no product selected, show all recipes plus "No Recipe" option
      return [
        { 
          id: 'no-recipe', 
          value: '', 
          label: 'No Recipe', 
          name: 'No Recipe',
          searchTerms: 'no recipe'
        },
        ...recipes.map(recipe => ({
          id: recipe.id,
          value: recipe.id,
          label: `${recipe.name} (${recipe.batch_size} ${recipe.unit})`,
          name: recipe.name,
          searchTerms: `${recipe.name} ${recipe.batch_size} ${recipe.unit}`.toLowerCase()
        }))
      ];
    }

    // Get recipe IDs associated with the selected product
    const associatedRecipeIds = productRecipes
      .filter(pr => pr.product_id === productionData.product_id)
      .map(pr => pr.recipe_id);

    // Filter recipes to only show those associated with the selected product
    const availableRecipes = recipes.filter(recipe => 
      associatedRecipeIds.includes(recipe.id)
    );

    return [
      { 
        id: 'no-recipe', 
        value: '', 
        label: 'No Recipe', 
        name: 'No Recipe',
        searchTerms: 'no recipe'
      },
      ...availableRecipes.map(recipe => ({
        id: recipe.id,
        value: recipe.id,
        label: `${recipe.name} (${recipe.batch_size} ${recipe.unit})`,
        name: recipe.name,
        searchTerms: `${recipe.name} ${recipe.batch_size} ${recipe.unit}`.toLowerCase()
      }))
    ];
  };

  const calculateOriginalRecipeTotalCost = () => {
    return recipeIngredients.reduce((total, ingredient) => {
      return total + (ingredient.quantity * ingredient.cost_per_unit);
    }, 0);
  };

  const calculateOriginalCostPerUnit = () => {
    const selectedRecipe = recipes.find(r => r.id === productionData.recipe_id);
    const originalBatchSize = selectedRecipe?.batch_size || 1;
    const originalTotalCost = calculateOriginalRecipeTotalCost();
    return originalTotalCost / originalBatchSize;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productionData.product_id || !productionData.quantity_produced || !productionData.staff_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data: batchData, error: batchError } = await supabase
        .from('production_batches')
        .insert({
          product_id: productionData.product_id,
          recipe_id: productionData.recipe_id || null,
          quantity_produced: parseInt(productionData.quantity_produced),
          production_date: dateStr,
          staff_id: productionData.staff_id,
          staff_name: staffMembers.find(s => s.id.toString() === productionData.staff_id)?.name || '',
          notes: productionData.notes || null
        })
        .select()
        .single();

      if (batchError) throw batchError;

      if (productionData.recipe_id && recipeIngredients.length > 0) {
        const selectedRecipe = recipes.find(r => r.id === productionData.recipe_id);
        const originalBatchSize = selectedRecipe?.batch_size || 1;
        const newQuantityProduced = parseInt(productionData.quantity_produced);
        
        // Calculate the scaling factor for ingredients
        const ingredientScaleFactor = newQuantityProduced / originalBatchSize;
        
        // Keep the original cost per unit EXACTLY the same regardless of quantity
        const originalCostPerUnit = calculateOriginalCostPerUnit();

        const ingredientPromises = recipeIngredients.map(ingredient => 
          supabase
            .from('production_ingredients')
            .insert({
              batch_id: batchData.id,
              ingredient_name: ingredient.ingredient_name,
              quantity_used: ingredient.quantity * ingredientScaleFactor,
              unit: ingredient.unit,
              cost_per_unit: ingredient.cost_per_unit
            })
        );

        const results = await Promise.all(ingredientPromises);
        
        for (const result of results) {
          if (result.error) throw result.error;
        }

        // Calculate total cost using the FIXED cost per unit multiplied by quantity produced
        const totalCostForNewQuantity = originalCostPerUnit * newQuantityProduced;

        await supabase
          .from('production_batches')
          .update({
            total_ingredient_cost: totalCostForNewQuantity,
            cost_per_unit: originalCostPerUnit
          })
          .eq('id', batchData.id);
      }

      toast.success('Production batch created successfully!');
      setProductionData({
        product_id: '',
        recipe_id: '',
        quantity_produced: '',
        staff_id: '',
        notes: ''
      });
      setAutoSelectedRecipe(false);
      onBatchCreated();
    } catch (error: any) {
      console.error('Error creating production batch:', error);
      toast.error('Failed to create production batch: ' + error.message);
    }
  };

  const productItems = products.map(product => ({
    id: product.id,
    value: product.id,
    label: `${product.code} - ${product.name}`,
    code: product.code,
    name: product.name,
    searchTerms: `${product.code} ${product.name}`.toLowerCase()
  }));

  const recipeItems = getAvailableRecipes();

  const staffItems = staffMembers.map(staff => ({
    id: staff.id.toString(),
    value: staff.id.toString(),
    label: staff.name,
    name: staff.name,
    searchTerms: staff.name.toLowerCase()
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Production Batch</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <Label htmlFor="product">Product *</Label>
            <Select value={productionData.product_id} onValueChange={handleProductChange}>
              <SelectTrigger>
                <SelectValue placeholder="Type to search products..." />
              </SelectTrigger>
              <SelectContent items={productItems} searchable={true} />
            </Select>
          </div>

          <div>
            <Label htmlFor="recipe" className="flex items-center gap-2">
              Recipe (Optional)
              {fetchingDefaultRecipe && <Loader2 className="h-4 w-4 animate-spin" />}
              {autoSelectedRecipe && !fetchingDefaultRecipe && (
                <span className="flex items-center text-xs text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Auto-selected
                </span>
              )}
            </Label>
            <Select 
              value={productionData.recipe_id} 
              onValueChange={handleRecipeChange} 
              disabled={fetchingDefaultRecipe || fetchingProductRecipes}
            >
              <SelectTrigger className={autoSelectedRecipe ? "border-green-500" : ""}>
                <SelectValue placeholder={
                  fetchingProductRecipes ? "Loading recipes..." : "Select a recipe..."
                } />
              </SelectTrigger>
              <SelectContent items={recipeItems} searchable={true} />
            </Select>
            {autoSelectedRecipe && (
              <p className="text-xs text-gray-500 mt-1">
                Recipe was automatically selected. You can change it if needed.
              </p>
            )}
            {productionData.product_id && !autoSelectedRecipe && (
              <p className="text-xs text-gray-500 mt-1">
                Showing only recipes associated with this product
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="quantity">Quantity Produced *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={productionData.quantity_produced}
              onChange={(e) => setProductionData({...productionData, quantity_produced: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="staff">Staff Member *</Label>
            <Select value={productionData.staff_id} onValueChange={(value) => setProductionData({...productionData, staff_id: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member..." />
              </SelectTrigger>
              <SelectContent items={staffItems} searchable={true} />
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={productionData.notes}
              onChange={(e) => setProductionData({...productionData, notes: e.target.value})}
              placeholder="Optional notes..."
            />
          </div>

          {productionData.recipe_id && recipeIngredients.length > 0 && (
            <div className="bg-gray-50 p-4 rounded">
              <h4 className="font-medium mb-2">Recipe Ingredients Preview</h4>
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  Recipe Batch Size: <span className="font-medium">{recipes.find(r => r.id === productionData.recipe_id)?.batch_size} {recipes.find(r => r.id === productionData.recipe_id)?.unit}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Total Ingredient Cost: <span className="font-medium text-green-600">R{calculateOriginalRecipeTotalCost().toFixed(2)}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Cost Per Unit: <span className="font-medium text-blue-600">R{calculateOriginalCostPerUnit().toFixed(2)} (FIXED - never changes)</span>
                </p>
                {productionData.quantity_produced && (
                  <p className="text-sm text-blue-600 font-medium">
                    For {productionData.quantity_produced} units: Total Cost = R{(calculateOriginalCostPerUnit() * parseInt(productionData.quantity_produced)).toFixed(2)}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2 text-xs font-medium text-gray-600 border-b pb-1">
                  <div>Ingredient</div>
                  <div>Recipe Qty</div>
                  <div>Scaled Qty</div>
                  <div>Unit Cost</div>
                  <div>Total Cost</div>
                </div>
                
                {recipeIngredients.map(ingredient => {
                  const scaleFactor = productionData.quantity_produced ? 
                    parseInt(productionData.quantity_produced) / (recipes.find(r => r.id === productionData.recipe_id)?.batch_size || 1) : 1;
                  const scaledQuantity = ingredient.quantity * scaleFactor;
                  const totalCost = scaledQuantity * ingredient.cost_per_unit;
                  
                  return (
                    <div key={ingredient.id} className="grid grid-cols-5 gap-2 text-sm py-1">
                      <div className="truncate" title={ingredient.ingredient_name}>
                        {ingredient.ingredient_name}
                      </div>
                      <div>
                        {ingredient.quantity} {ingredient.unit}
                      </div>
                      <div className="text-blue-600 font-medium">
                        {scaledQuantity.toFixed(2)} {ingredient.unit}
                      </div>
                      <div>
                        R{ingredient.cost_per_unit.toFixed(2)}
                      </div>
                      <div className="text-green-600 font-medium">
                        R{totalCost.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Button type="submit" className="w-full">
            Create Production Batch
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProductionForm;
