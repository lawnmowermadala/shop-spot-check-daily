import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';

// Types
interface ProductionBatch {
  id: string;
  product_id: string;
  product_name: string;
  quantity_produced: number;
  production_date: string;
  staff_name: string;
  created_at: string;
}

interface ProductionIngredient {
  id: string;
  batch_id: string;
  ingredient_name: string;
  quantity_used: number;
  unit: string;
  cost_per_unit: number;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
}

const ProductionPage = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  
  // Production form state
  const [productionData, setProductionData] = useState({
    product_id: '',
    quantity_produced: '',
    staff_name: 'Elton',
    notes: ''
  });
  
  // Ingredient form state
  const [ingredientData, setIngredientData] = useState({
    ingredient_name: '',
    quantity_used: '',
    unit: 'kg',
    cost_per_unit: ''
  });

  // Elton Convertor Calculator state
  const [calculatorData, setCalculatorData] = useState({
    // Bulk purchase info
    bulkQuantity: '',
    bulkUnit: 'kg',
    bulkPrice: '',
    
    // Usage info
    usedQuantity: '',
    usedUnit: 'kg',
    
    // Results
    costPerUnit: '',
    totalCost: '',
    
    // Unit conversion
    convertValue: '',
    convertFromUnit: 'kg',
    convertToUnit: 'g',
    convertedValue: ''
  });

  // Calculate cost based on bulk purchase and usage
  const calculateCost = () => {
    const bulkQty = parseFloat(calculatorData.bulkQuantity);
    const bulkPrc = parseFloat(calculatorData.bulkPrice);
    const usedQty = parseFloat(calculatorData.usedQuantity);
    
    if (isNaN(bulkQty) {
      setCalculatorData({
        ...calculatorData,
        costPerUnit: '',
        totalCost: ''
      });
      return;
    }

    // First convert everything to grams for consistent calculations
    const bulkInGrams = convertToGrams(bulkQty, calculatorData.bulkUnit);
    const usedInGrams = convertToGrams(usedQty, calculatorData.usedUnit);

    if (bulkInGrams <= 0 || isNaN(bulkPrc) {
      setCalculatorData({
        ...calculatorData,
        costPerUnit: '',
        totalCost: ''
      });
      return;
    }

    const costPerGram = bulkPrc / bulkInGrams;
    const costPerKg = costPerGram * 1000;
    const costPerUsed = usedInGrams * costPerGram;

    setCalculatorData({
      ...calculatorData,
      costPerUnit: costPerKg.toFixed(4),
      totalCost: costPerUsed.toFixed(2)
    });
  };

  // Handle unit conversion
  const handleUnitConversion = () => {
    const value = parseFloat(calculatorData.convertValue);
    
    if (isNaN(value)) {
      setCalculatorData({
        ...calculatorData,
        convertedValue: ''
      });
      return;
    }

    // Convert to grams first, then to target unit
    const valueInGrams = convertToGrams(value, calculatorData.convertFromUnit);
    const convertedValue = convertFromGrams(valueInGrams, calculatorData.convertToUnit);
    
    setCalculatorData({
      ...calculatorData,
      convertedValue: convertedValue.toFixed(4)
    });
  };

  // Convert any unit to grams
  const convertToGrams = (value: number, unit: string): number => {
    switch (unit) {
      case 'kg': return value * 1000;
      case 'g': return value;
      case 'l': return value * 1000; // Assuming 1ml = 1g for water-based liquids
      case 'ml': return value;
      default: return value;
    }
  };

  // Convert grams to any unit
  const convertFromGrams = (grams: number, unit: string): number => {
    switch (unit) {
      case 'kg': return grams / 1000;
      case 'g': return grams;
      case 'l': return grams / 1000;
      case 'ml': return grams;
      default: return grams;
    }
  };

  // Fetch Products
  const { data: products = [] } = useQuery({
    queryKey: ['production_products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, code')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    }
  });

  // Fetch Production Batches for selected date
  const { data: productionBatches = [] } = useQuery({
    queryKey: ['production_batches', date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!date) return [];
      
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('production_batches')
        .select(`
          id,
          product_id,
          products!inner(name, code),
          quantity_produced,
          production_date,
          staff_name,
          created_at
        `)
        .eq('production_date', dateStr)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map((batch: any) => ({
        ...batch,
        product_name: batch.products.name,
        product_code: batch.products.code
      })) as ProductionBatch[];
    }
  });

  // Fetch Ingredients for active batch
  const { data: batchIngredients = [] } = useQuery({
    queryKey: ['production_ingredients', activeBatchId],
    queryFn: async () => {
      if (!activeBatchId) return [];
      
      const { data, error } = await supabase
        .from('production_ingredients')
        .select('*')
        .eq('batch_id', activeBatchId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProductionIngredient[];
    }
  });

  // Add Production Batch
  const addProductionBatch = useMutation({
    mutationFn: async () => {
      if (!date || !productionData.product_id || !productionData.quantity_produced) {
        throw new Error('Please fill all required fields');
      }

      const { data, error } = await supabase
        .from('production_batches')
        .insert({
          product_id: productionData.product_id,
          quantity_produced: Number(productionData.quantity_produced),
          production_date: format(date, 'yyyy-MM-dd'),
          staff_name: productionData.staff_name,
          notes: productionData.notes
        })
        .select();
      
      if (error) throw error;
      return data[0] as ProductionBatch;
    },
    onSuccess: (batch) => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
      setProductionData({
        product_id: '',
        quantity_produced: '',
        staff_name: 'Elton',
        notes: ''
      });
      setActiveBatchId(batch.id);
      toast("Production batch created successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Add Ingredient to Batch
  const addIngredientToBatch = useMutation({
    mutationFn: async () => {
      if (!activeBatchId || !ingredientData.ingredient_name || !ingredientData.quantity_used || !ingredientData.cost_per_unit) {
        throw new Error('Please fill all ingredient fields');
      }

      const { error } = await supabase
        .from('production_ingredients')
        .insert({
          batch_id: activeBatchId,
          ingredient_name: ingredientData.ingredient_name,
          quantity_used: Number(ingredientData.quantity_used),
          unit: ingredientData.unit,
          cost_per_unit: Number(ingredientData.cost_per_unit)
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_ingredients'] });
      setIngredientData({
        ingredient_name: '',
        quantity_used: '',
        unit: 'kg',
        cost_per_unit: ''
      });
      toast("Ingredient added to batch!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Delete Ingredient
  const deleteIngredient = useMutation({
    mutationFn: async (ingredientId: string) => {
      const { error } = await supabase
        .from('production_ingredients')
        .delete()
        .eq('id', ingredientId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_ingredients'] });
      toast("Ingredient removed from batch!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Calculate total cost of ingredients for the active batch
  const calculateTotalCost = () => {
    return batchIngredients.reduce((total, ingredient) => {
      return total + (ingredient.quantity_used * ingredient.cost_per_unit);
    }, 0);
  };

  // Calculate total production for the day
  const calculateDailyProduction = () => {
    return productionBatches.reduce((sum, batch) => sum + batch.quantity_produced, 0);
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Daily Production Tracking</h1>
        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">Production Staff</span>
      </div>
      
      {/* Date Picker */}
      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal">
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
        <div className="text-sm text-gray-600">
          {productionBatches.length} batches | {calculateDailyProduction()} units produced
        </div>
      </div>

      {/* Elton Convertor Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Elton Convertor Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cost Calculation Section */}
          <div className="space-y-4">
            <h3 className="font-medium">Cost Calculation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Bulk Purchase</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={calculatorData.bulkQuantity}
                    onChange={(e) => setCalculatorData({...calculatorData, bulkQuantity: e.target.value})}
                    onBlur={calculateCost}
                  />
                  <select
                    className="p-2 border rounded"
                    value={calculatorData.bulkUnit}
                    onChange={(e) => setCalculatorData({...calculatorData, bulkUnit: e.target.value})}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Total Price</label>
                <Input
                  type="number"
                  placeholder="Price paid"
                  value={calculatorData.bulkPrice}
                  onChange={(e) => setCalculatorData({...calculatorData, bulkPrice: e.target.value})}
                  onBlur={calculateCost}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Amount Used</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Quantity used"
                    value={calculatorData.usedQuantity}
                    onChange={(e) => setCalculatorData({...calculatorData, usedQuantity: e.target.value})}
                    onBlur={calculateCost}
                  />
                  <select
                    className="p-2 border rounded"
                    value={calculatorData.usedUnit}
                    onChange={(e) => setCalculatorData({...calculatorData, usedUnit: e.target.value})}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Cost per kg</div>
                <div className="text-lg font-semibold">
                  {calculatorData.costPerUnit ? `R${calculatorData.costPerUnit}` : 'R0.0000'}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Total Cost for Used Amount</div>
                <div className="text-lg font-semibold">
                  {calculatorData.totalCost ? `R${calculatorData.totalCost}` : 'R0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* Unit Conversion Section */}
          <div className="space-y-4">
            <h3 className="font-medium">Unit Conversion</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input
                type="number"
                placeholder="Value"
                value={calculatorData.convertValue}
                onChange={(e) => setCalculatorData({...calculatorData, convertValue: e.target.value})}
                onBlur={handleUnitConversion}
              />
              <select
                className="p-2 border rounded"
                value={calculatorData.convertFromUnit}
                onChange={(e) => setCalculatorData({...calculatorData, convertFromUnit: e.target.value})}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
              </select>
              <div className="flex items-center justify-center">
                <span className="text-gray-500">to</span>
              </div>
              <select
                className="p-2 border rounded"
                value={calculatorData.convertToUnit}
                onChange={(e) => setCalculatorData({...calculatorData, convertToUnit: e.target.value})}
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="l">l</option>
              </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Converted Value</div>
              <div className="text-lg font-semibold">
                {calculatorData.convertedValue || '0'} {calculatorData.convertToUnit}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rest of your existing components... */}
      {/* Production Batch Creation */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Production Batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              className="p-2 border rounded"
              value={productionData.product_id}
              onChange={(e) => setProductionData({...productionData, product_id: e.target.value})}
              required
            >
              <option value="">Select Product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.code})
                </option>
              ))}
            </select>

            <Input
              type="number"
              placeholder="Quantity Produced"
              value={productionData.quantity_produced}
              onChange={(e) => setProductionData({...productionData, quantity_produced: e.target.value})}
              required
            />

            <Input
              placeholder="Staff Name"
              value={productionData.staff_name}
              onChange={(e) => setProductionData({...productionData, staff_name: e.target.value})}
              required
            />

            <Input
              placeholder="Notes (optional)"
              value={productionData.notes}
              onChange={(e) => setProductionData({...productionData, notes: e.target.value})}
              className="md:col-span-2"
            />
          </div>

          <Button 
            onClick={() => addProductionBatch.mutate()}
            disabled={addProductionBatch.isPending}
          >
            {addProductionBatch.isPending ? "Creating..." : "Create Batch"}
          </Button>
        </CardContent>
      </Card>

      {/* Current Batch Ingredients */}
      {activeBatchId && (
        <Card>
          <CardHeader>
            <CardTitle>Ingredients Used in This Batch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input
                placeholder="Ingredient Name"
                value={ingredientData.ingredient_name}
                onChange={(e) => setIngredientData({...ingredientData, ingredient_name: e.target.value})}
                required
              />
              <Input
                type="number"
                placeholder="Quantity"
                value={ingredientData.quantity_used}
                onChange={(e) => setIngredientData({...ingredientData, quantity_used: e.target.value})}
                required
              />
              <select
                className="p-2 border rounded"
                value={ingredientData.unit}
                onChange={(e) => setIngredientData({...ingredientData, unit: e.target.value})}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="unit">unit</option>
              </select>
              <Input
                type="number"
                placeholder="Cost per unit"
                value={ingredientData.cost_per_unit}
                onChange={(e) => setIngredientData({...ingredientData, cost_per_unit: e.target.value})}
                required
              />
            </div>
            <Button 
              onClick={() => addIngredientToBatch.mutate()}
              disabled={addIngredientToBatch.isPending}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Ingredient
            </Button>

            {/* Ingredients List with Costs */}
            {batchIngredients.length > 0 && (
              <div className="border rounded-lg divide-y">
                <div className="grid grid-cols-12 p-2 font-medium bg-gray-50">
                  <div className="col-span-4">Ingredient</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit Cost</div>
                  <div className="col-span-2">Total Cost</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {batchIngredients.map(ingredient => (
                  <div key={ingredient.id} className="grid grid-cols-12 p-2 items-center">
                    <div className="col-span-4">{ingredient.ingredient_name}</div>
                    <div className="col-span-2">{ingredient.quantity_used} {ingredient.unit}</div>
                    <div className="col-span-2">R{ingredient.cost_per_unit.toFixed(2)}/{ingredient.unit}</div>
                    <div className="col-span-2">R{(ingredient.quantity_used * ingredient.cost_per_unit).toFixed(2)}</div>
                    <div className="col-span-2 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-700 h-8 w-8"
                        onClick={() => deleteIngredient.mutate(ingredient.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-12 p-2 font-medium border-t">
                  <div className="col-span-8">Total Ingredients Cost</div>
                  <div className="col-span-4 text-right">R{calculateTotalCost().toFixed(2)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Production Batches */}
      <Card>
        <CardHeader>
          <CardTitle>
            Production Batches for {date && format(date, 'MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productionBatches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionBatches.map(batch => (
                  <TableRow 
                    key={batch.id} 
                    className={activeBatchId === batch.id ? 'bg-gray-50' : ''}
                  >
                    <TableCell>{batch.product_name}</TableCell>
                    <TableCell>{batch.product_code}</TableCell>
                    <TableCell>{batch.quantity_produced}</TableCell>
                    <TableCell>{batch.staff_name}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveBatchId(batch.id)}
                      >
                        {activeBatchId === batch.id ? 'Viewing' : 'View Ingredients'}
                      </Button>
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
      
      <Navigation />
    </div>
  );
};

export default ProductionPage;
