
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  code: string;
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
}

const ProductionForm = ({
  products,
  recipes,
  staffMembers,
  recipeIngredients,
  date,
  onBatchCreated
}: ProductionFormProps) => {
  const [fetchingDefaultRecipe, setFetchingDefaultRecipe] = useState(false);
  const [productionData, setProductionData] = useState({
    product_id: '',
    recipe_id: '',
    quantity_produced: '',
    staff_id: '',
    notes: ''
  });

  const handleProductChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value;
    console.log('Product selected:', productId);
    
    // Reset recipe selection first
    setProductionData(prev => ({
      ...prev,
      product_id: productId,
      recipe_id: ''
    }));

    if (!productId) return;
    
    try {
      setFetchingDefaultRecipe(true);
      console.log('Fetching default recipe for product:', productId);
      
      const { data: relationData, error: relationError } = await supabase
        .from('product_recipes')
        .select('recipe_id')
        .eq('product_id', productId)
        .eq('is_default', true)
        .maybeSingle();
      
      console.log('Product recipe relation:', relationData, relationError);
      
      if (relationError) {
        console.log('Error fetching default recipe:', relationError);
        setFetchingDefaultRecipe(false);
        return;
      }
      
      if (relationData && relationData.recipe_id) {
        console.log('Default recipe found:', relationData.recipe_id);
        
        // Update state with the default recipe
        setProductionData(prev => ({
          ...prev,
          product_id: productId,
          recipe_id: relationData.recipe_id
        }));
        
        toast.success('Default recipe automatically selected!');
      } else {
        console.log('No default recipe found for this product');
      }
      
      setFetchingDefaultRecipe(false);
    } catch (error) {
      console.error('Error fetching default recipe:', error);
      setFetchingDefaultRecipe(false);
    }
  };

  const calculateRecipeTotalCost = () => {
    if (!recipeIngredients.length) return 0;
    return recipeIngredients.reduce((total, ingredient) => {
      return total + (ingredient.cost_per_unit * ingredient.quantity);
    }, 0);
  };

  const calculateProductionCostPerUnit = () => {
    const totalRecipeCost = calculateRecipeTotalCost();
    const quantity = Number(productionData.quantity_produced) || 0;
    return quantity > 0 ? totalRecipeCost / quantity : 0;
  };

  const calculateScaledIngredientCosts = () => {
    if (!productionData.recipe_id || !productionData.quantity_produced || !recipeIngredients.length) {
      return [];
    }

    const selectedRecipe = recipes.find(r => r.id === productionData.recipe_id);
    if (!selectedRecipe || selectedRecipe.batch_size <= 0) return [];

    const scalingFactor = Number(productionData.quantity_produced) / selectedRecipe.batch_size;

    return recipeIngredients.map(ingredient => ({
      ...ingredient,
      scaled_quantity: ingredient.quantity * scalingFactor,
      scaled_cost: ingredient.cost_per_unit * ingredient.quantity * scalingFactor,
      used_unit: ingredient.unit
    }));
  };

  const handleSubmit = async () => {
    if (!productionData.product_id || !productionData.quantity_produced || !productionData.staff_id) {
      toast.error('Please fill all required fields');
      return;
    }

    const selectedStaff = staffMembers.find(s => s.id.toString() === productionData.staff_id);
    if (!selectedStaff) {
      toast.error('Selected staff member not found');
      return;
    }

    try {
      const dateStr = date.toISOString().split('T')[0];
      const totalRecipeCost = productionData.recipe_id ? calculateRecipeTotalCost() : 0;
      const costPerUnit = productionData.recipe_id ? calculateProductionCostPerUnit() : 0;

      const { data, error } = await supabase
        .from('production_batches')
        .insert({
          product_id: productionData.product_id,
          recipe_id: productionData.recipe_id || null,
          quantity_produced: Number(productionData.quantity_produced),
          production_date: dateStr,
          staff_name: selectedStaff.name,
          staff_id: productionData.staff_id,
          notes: productionData.notes,
          total_ingredient_cost: totalRecipeCost,
          cost_per_unit: costPerUnit
        })
        .select()
        .single();

      if (error) throw error;

      if (productionData.recipe_id && recipeIngredients.length > 0) {
        const scaledIngredients = calculateScaledIngredientCosts();
        
        const ingredientInserts = scaledIngredients.map(ingredient => ({
          batch_id: data.id,
          ingredient_name: ingredient.ingredient_name,
          quantity_used: ingredient.scaled_quantity,
          unit: ingredient.used_unit || ingredient.unit,
          cost_per_unit: ingredient.cost_per_unit
        }));

        const { error: ingredientError } = await supabase
          .from('production_ingredients')
          .insert(ingredientInserts);

        if (ingredientError) throw ingredientError;
      }

      setProductionData({
        product_id: '',
        recipe_id: '',
        quantity_produced: '',
        staff_id: '',
        notes: ''
      });
      
      toast.success('Production batch created successfully!');
      onBatchCreated();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add Production Batch</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product *</label>
            <select
              value={productionData.product_id}
              onChange={handleProductChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.code} - {product.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Recipe (Optional)
              {fetchingDefaultRecipe && <span className="ml-2 text-xs text-blue-600">Loading default recipe...</span>}
            </label>
            <select
              value={productionData.recipe_id}
              onChange={(e) => setProductionData({...productionData, recipe_id: e.target.value})}
              className="w-full p-2 border rounded"
              disabled={fetchingDefaultRecipe}
            >
              <option value="">Select a recipe</option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name} (Batch: {recipe.batch_size} {recipe.unit})
                </option>
              ))}
            </select>
            {productionData.recipe_id && (
              <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                ✓ Recipe selected
                <button 
                  type="button"
                  onClick={() => setProductionData({...productionData, recipe_id: ''})}
                  className="text-red-500 hover:text-red-700 ml-2"
                  title="Clear recipe selection"
                >
                  ✕ Clear
                </button>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Staff Member *</label>
            <select
              value={productionData.staff_id}
              onChange={(e) => setProductionData({...productionData, staff_id: e.target.value})}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select staff member</option>
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.id.toString()}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Quantity *</label>
            <Input
              type="number"
              value={productionData.quantity_produced}
              onChange={(e) => setProductionData({...productionData, quantity_produced: e.target.value})}
              placeholder="0"
              required
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Notes</label>
          <Input
            value={productionData.notes}
            onChange={(e) => setProductionData({...productionData, notes: e.target.value})}
            placeholder="Optional notes"
          />
        </div>

        {/* Recipe Cost Preview */}
        {productionData.recipe_id && productionData.quantity_produced && recipeIngredients.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Cost Preview (Based on Recipe)</h4>
            
            <div className="mb-4">
              <h5 className="text-sm font-medium mb-2">Scaled Ingredients for Production:</h5>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Recipe Qty</TableHead>
                    <TableHead>Scaled Qty</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculateScaledIngredientCosts().map((ingredient, index) => (
                    <TableRow key={index}>
                      <TableCell>{ingredient.ingredient_name}</TableCell>
                      <TableCell>{ingredient.quantity} {ingredient.used_unit || ingredient.unit}</TableCell>
                      <TableCell>{ingredient.scaled_quantity.toFixed(2)} {ingredient.used_unit || ingredient.unit}</TableCell>
                      <TableCell>R{ingredient.cost_per_unit.toFixed(2)}</TableCell>
                      <TableCell>R{ingredient.scaled_cost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Recipe Batch Size:</span>
                <div className="font-medium">
                  {recipes.find(r => r.id === productionData.recipe_id)?.batch_size} {recipes.find(r => r.id === productionData.recipe_id)?.unit}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Total Ingredient Cost:</span>
                <div className="font-medium text-lg">R{(calculateScaledIngredientCosts().reduce((sum, i) => sum + i.scaled_cost, 0)).toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600">Cost Per Unit:</span>
                <div className="font-medium text-lg">R{calculateProductionCostPerUnit().toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-4">
          <Button 
            onClick={handleSubmit}
            disabled={!productionData.product_id || !productionData.quantity_produced || !productionData.staff_id}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Batch
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductionForm;
