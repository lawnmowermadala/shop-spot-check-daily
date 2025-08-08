import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

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
  const [productionData, setProductionData] = useState({
    product_id: '',
    recipe_id: '',
    quantity_produced: '',
    staff_id: '',
    notes: ''
  });

  // Update parent component when recipe changes
  useEffect(() => {
    onRecipeSelected(productionData.recipe_id || null);
  }, [productionData.recipe_id, onRecipeSelected]);

  const handleProductChange = async (productId: string) => {
    setProductionData({...productionData, product_id: productId, recipe_id: ''});
    
    if (!productId) return;
    
    setFetchingDefaultRecipe(true);
    console.log('Fetching default recipe for product:', productId);
    
    try {
      const { data: batches, error } = await supabase
        .from('production_batches')
        .select('recipe_id, recipes(name)')
        .eq('product_id', productId)
        .not('recipe_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching production batches:', error);
        setFetchingDefaultRecipe(false);
        return;
      }

      console.log('Found batches:', batches);

      if (batches && batches.length > 0) {
        const recipeCounts = batches.reduce((acc: Record<string, number>, batch) => {
          if (batch.recipe_id) {
            acc[batch.recipe_id] = (acc[batch.recipe_id] || 0) + 1;
          }
          return acc;
        }, {});

        const mostUsedRecipeId = Object.entries(recipeCounts)
          .sort(([,a], [,b]) => b - a)[0][0];

        console.log('Most used recipe ID:', mostUsedRecipeId);
        
        setProductionData(prev => ({...prev, recipe_id: mostUsedRecipeId}));
        toast.success('Default recipe selected based on production history');
      } else {
        console.log('No previous batches found for this product');
      }
      
      setFetchingDefaultRecipe(false);
    } catch (error) {
      console.error('Error fetching default recipe:', error);
      setFetchingDefaultRecipe(false);
    }
  };

  const handleRecipeChange = (recipeId: string) => {
    setProductionData({...productionData, recipe_id: recipeId});
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
        
        // Keep the original cost per unit fixed
        const originalCostPerUnit = calculateOriginalCostPerUnit();
        const totalCostForNewQuantity = originalCostPerUnit * newQuantityProduced;

        const ingredientPromises = recipeIngredients.map(ingredient => 
          supabase
            .from('production_ingredients')
            .insert({
              batch_id: batchData.id,
              ingredient_name: ingredient.ingredient_name,
              quantity_used: ingredient.quantity * ingredientScaleFactor, // Scale ingredient quantity
              unit: ingredient.unit,
              cost_per_unit: ingredient.cost_per_unit // Keep original cost per unit
            })
        );

        const results = await Promise.all(ingredientPromises);
        
        for (const result of results) {
          if (result.error) throw result.error;
        }

        // Use the fixed cost per unit and calculate total cost based on quantity produced
        await supabase
          .from('production_batches')
          .update({
            total_ingredient_cost: totalCostForNewQuantity,
            cost_per_unit: originalCostPerUnit // Keep original cost per unit fixed
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

  const recipeItems = [
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

          {/* Product Dropdown Select with enhanced search */}
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
            <Label htmlFor="recipe">
              Recipe (Optional)
              {fetchingDefaultRecipe && <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />}
            </Label>
            <Select value={productionData.recipe_id} onValueChange={handleRecipeChange} disabled={fetchingDefaultRecipe}>
              <SelectTrigger>
                <SelectValue placeholder="Select a recipe..." />
              </SelectTrigger>
              <SelectContent items={recipeItems} searchable={true} />
            </Select>
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
                  Cost Per Unit: <span className="font-medium text-blue-600">R{calculateOriginalCostPerUnit().toFixed(2)} (cost per unit stays fixed)</span>
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
