import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, Printer, BarChart2, Edit, Save, X } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';
import RecipeEditModal from '@/components/RecipeEditModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Types
interface ProductionBatch {
  id: string;
  product_id: string;
  product_name: string;
  product_code?: string;
  recipe_id?: string;
  recipe_name?: string;
  quantity_produced: number;
  production_date: string;
  staff_name: string;
  staff_id?: string;
  notes?: string;
  total_ingredient_cost?: number;
  cost_per_unit?: number;
  created_at: string;
}

interface ProductionIngredient {
  id: string;
  batch_id: string;
  ingredient_name: string;
  quantity_used: number;
  unit: string;
  cost_per_unit: number;
  pack_size?: number;
  pack_price?: number;
  created_at: string;
}

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

interface DailyProduction {
  date: string;
  total_production: number;
}

interface StaffProductionStats {
  staff_name: string;
  total_batches: number;
  total_units: number;
}

const ProductionPage = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showStaffAnalytics, setShowStaffAnalytics] = useState(false);
  const [comparisonDays, setComparisonDays] = useState(7);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Production form state
  const [productionData, setProductionData] = useState({
    product_id: '',
    recipe_id: '',
    quantity_produced: '',
    staff_id: '',
    notes: ''
  });
  
  // Ingredient form state
  const [ingredientData, setIngredientData] = useState({
    ingredient_name: '',
    quantity_used: '',
    unit: 'kg',
    cost_per_unit: '',
    pack_size: '',
    pack_price: ''
  });

  // Edit ingredient form state
  const [editIngredientData, setEditIngredientData] = useState({
    ingredient_name: '',
    quantity_used: '',
    unit: 'kg',
    cost_per_unit: '',
    pack_size: '',
    pack_price: ''
  });

  // Fetch staff members from staff table - just id and name
  const { data: staffMembers = [] } = useQuery<StaffMember[]>({
    queryKey: ['staff_members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch recipes
  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch recipe ingredients for selected recipe
  const { data: recipeIngredients = [] } = useQuery<RecipeIngredient[]>({
    queryKey: ['recipe_ingredients', productionData.recipe_id],
    queryFn: async () => {
      if (!productionData.recipe_id) return [];
      
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', productionData.recipe_id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!productionData.recipe_id
  });

  // Fetch production batches
  const { data: productionBatches = [] } = useQuery<ProductionBatch[]>({
    queryKey: ['production_batches', date.toISOString().split('T')[0]],
    queryFn: async () => {
      // Format date as YYYY-MM-DD for proper date comparison
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('production_batches')
        .select('*, products(name, code), recipes(name)')
        .eq('production_date', dateStr)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(batch => ({
        ...batch,
        product_name: (batch.products as any)?.name || 'Unknown',
        product_code: (batch.products as any)?.code || 'N/A',
        recipe_name: (batch.recipes as any)?.name || 'No Recipe'
      }));
    }
  });

  // Fetch staff production analytics
  const { data: staffStats = [] } = useQuery<StaffProductionStats[]>({
    queryKey: ['staff_production_stats', comparisonDays, date.toISOString().split('T')[0]],
    queryFn: async () => {
      const endDate = date;
      const startDate = subDays(endDate, comparisonDays);
      
      const { data, error } = await supabase
        .from('production_batches')
        .select('staff_name, quantity_produced')
        .gte('production_date', format(startDate, 'yyyy-MM-dd'))
        .lte('production_date', format(endDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Group by staff and calculate totals
      const statsMap = new Map<string, StaffProductionStats>();
      
      data.forEach(batch => {
        const existing = statsMap.get(batch.staff_name) || {
          staff_name: batch.staff_name,
          total_batches: 0,
          total_units: 0
        };
        
        existing.total_batches += 1;
        existing.total_units += batch.quantity_produced;
        statsMap.set(batch.staff_name, existing);
      });
      
      return Array.from(statsMap.values()).sort((a, b) => b.total_units - a.total_units);
    },
    enabled: showStaffAnalytics
  });

  // Fetch ingredients for active batch
  const { data: batchIngredients = [] } = useQuery<ProductionIngredient[]>({
    queryKey: ['batch_ingredients', activeBatchId],
    queryFn: async () => {
      if (!activeBatchId) return [];
      const { data, error } = await supabase
        .from('production_ingredients')
        .select('*')
        .eq('batch_id', activeBatchId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeBatchId
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch historical production data
  const { data: historicalProduction = [] } = useQuery<DailyProduction[]>({
    queryKey: ['historical_production', comparisonDays, date.toISOString().split('T')[0]],
    queryFn: async () => {
      const endDate = date;
      const startDate = subDays(endDate, comparisonDays);
      
      const { data, error } = await supabase
        .from('production_batches')
        .select('production_date, quantity_produced')
        .gte('production_date', format(startDate, 'yyyy-MM-dd'))
        .lte('production_date', format(endDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Group by date and sum quantities
      const dailyTotals = new Map<string, number>();
      
      data.forEach(batch => {
        const dateKey = format(new Date(batch.production_date), 'yyyy-MM-dd');
        const existing = dailyTotals.get(dateKey) || 0;
        dailyTotals.set(dateKey, existing + batch.quantity_produced);
      });
      
      return Array.from(dailyTotals.entries()).map(([date, total_production]) => ({
        date,
        total_production
      }));
    },
    enabled: showComparison
  });

  // Calculate daily production total
  const calculateDailyProduction = () => {
    return productionBatches.reduce((total, batch) => total + batch.quantity_produced, 0);
  };

  // Prepare chart data for production comparison
  const chartData = historicalProduction.map(item => ({
    date: format(new Date(item.date), 'MMM d'),
    production: item.total_production
  }));

  // Prepare chart data for staff analytics
  const staffChartData = staffStats.map(stat => ({
    name: stat.staff_name,
    units: stat.total_units
  }));

  // Calculate total recipe cost based on recipe ingredients
  const calculateRecipeTotalCost = () => {
    if (!recipeIngredients.length) return 0;
    
    return recipeIngredients.reduce((total, ingredient) => {
      return total + (ingredient.cost_per_unit * ingredient.quantity);
    }, 0);
  };

  // Calculate cost per unit for production batch
  const calculateProductionCostPerUnit = () => {
    const totalRecipeCost = calculateRecipeTotalCost();
    const quantity = Number(productionData.quantity_produced) || 0;
    return quantity > 0 ? totalRecipeCost / quantity : 0;
  };

  // Calculate scaled ingredient costs for production quantity
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

  // Mutation to update batch cost
  const updateBatchCostMutation = useMutation({
    mutationFn: async (batchId: string) => {
      // Fetch all ingredients for the batch
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('production_ingredients')
        .select('*')
        .eq('batch_id', batchId);
      
      if (ingredientsError) throw ingredientsError;
      
      // Calculate total ingredient cost
      const totalIngredientCost = ingredients.reduce(
        (sum, ingredient) => sum + (ingredient.quantity_used * ingredient.cost_per_unit),
        0
      );
      
      // Fetch batch to get quantity produced
      const { data: batch, error: batchError } = await supabase
        .from('production_batches')
        .select('quantity_produced')
        .eq('id', batchId)
        .single();
      
      if (batchError) throw batchError;
      
      // Calculate cost per unit
      const costPerUnit = batch.quantity_produced > 0 
        ? totalIngredientCost / batch.quantity_produced 
        : 0;
      
      // Update batch with new costs
      const { error: updateError } = await supabase
        .from('production_batches')
        .update({
          total_ingredient_cost: totalIngredientCost,
          cost_per_unit: costPerUnit
        })
        .eq('id', batchId);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to update batch cost: ' + error.message);
    }
  });

  // Create production batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async () => {
      if (!productionData.product_id || !productionData.quantity_produced || !productionData.staff_id) {
        throw new Error('Please fill all required fields');
      }

      // Get staff name from staff_id
      const selectedStaff = staffMembers.find(s => s.id.toString() === productionData.staff_id);
      if (!selectedStaff) {
        throw new Error('Selected staff member not found');
      }

      // Format date as YYYY-MM-DD for consistency
      const dateStr = format(date, 'yyyy-MM-dd');

      // Calculate costs based on recipe ingredients if recipe is selected
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

      // If recipe is selected, automatically add scaled ingredients from recipe
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

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
      queryClient.invalidateQueries({ queryKey: ['staff_production_stats'] });
      setProductionData({
        product_id: '',
        recipe_id: '',
        quantity_produced: '',
        staff_id: '',
        notes: ''
      });
      toast.success('Production batch created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      // First delete ingredients
      const { error: ingredientsError } = await supabase
        .from('production_ingredients')
        .delete()
        .eq('batch_id', batchId);

      if (ingredientsError) throw ingredientsError;

      // Then delete batch
      const { error } = await supabase
        .from('production_batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
      queryClient.invalidateQueries({ queryKey: ['staff_production_stats'] });
      setActiveBatchId(null);
      toast.success('Production batch deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Add ingredient mutation
  const addIngredientMutation = useMutation({
    mutationFn: async () => {
      if (!activeBatchId || !ingredientData.ingredient_name || !ingredientData.quantity_used) {
        throw new Error('Please fill all required fields');
      }
      const { data, error } = await supabase
        .from('production_ingredients')
        .insert({
          batch_id: activeBatchId,
          ingredient_name: ingredientData.ingredient_name,
          quantity_used: Number(ingredientData.quantity_used),
          unit: ingredientData.unit,
          cost_per_unit: Number(ingredientData.cost_per_unit) || 0,
          pack_size: ingredientData.pack_size ? Number(ingredientData.pack_size) : null,
          pack_price: ingredientData.pack_price ? Number(ingredientData.pack_price) : null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_ingredients'] });
      setIngredientData({
        ingredient_name: '',
        quantity_used: '',
        unit: 'kg',
        cost_per_unit: '',
        pack_size: '',
        pack_price: ''
      });
      toast.success('Ingredient added successfully!');
      if (activeBatchId) {
        updateBatchCostMutation.mutate(activeBatchId);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete ingredient mutation
  const deleteIngredientMutation = useMutation({
    mutationFn: async (ingredientId: string) => {
      const { error } = await supabase
        .from('production_ingredients')
        .delete()
        .eq('id', ingredientId);

      if (error) throw error;
    },
    onSuccess: (_, ingredientId) => {
      queryClient.invalidateQueries({ queryKey: ['batch_ingredients'] });
      toast.success('Ingredient removed successfully!');
      if (activeBatchId) {
        updateBatchCostMutation.mutate(activeBatchId);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Update ingredient mutation
  const updateIngredientMutation = useMutation({
    mutationFn: async ({ ingredientId, data }: { ingredientId: string, data: any }) => {
      const { error } = await supabase
        .from('production_ingredients')
        .update({
          ingredient_name: data.ingredient_name,
          quantity_used: Number(data.quantity_used),
          unit: data.unit,
          cost_per_unit: Number(data.cost_per_unit) || 0,
          pack_size: data.pack_size ? Number(data.pack_size) : null,
          pack_price: data.pack_price ? Number(data.pack_price) : null
        })
        .eq('id', ingredientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_ingredients'] });
      setEditingIngredientId(null);
      setEditIngredientData({
        ingredient_name: '',
        quantity_used: '',
        unit: 'kg',
        cost_per_unit: '',
        pack_size: '',
        pack_price: ''
      });
      toast.success('Ingredient updated successfully!');
      if (activeBatchId) {
        updateBatchCostMutation.mutate(activeBatchId);
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to update ingredient: ' + error.message);
    }
  });

  const handleEditIngredient = (ingredient: ProductionIngredient) => {
    setEditingIngredientId(ingredient.id);
    setEditIngredientData({
      ingredient_name: ingredient.ingredient_name,
      quantity_used: ingredient.quantity_used.toString(),
      unit: ingredient.unit,
      cost_per_unit: ingredient.cost_per_unit.toString(),
      pack_size: ingredient.pack_size ? ingredient.pack_size.toString() : '',
      pack_price: ingredient.pack_price ? ingredient.pack_price.toString() : ''
    });
  };

  const handleUpdateIngredient = () => {
    if (!editingIngredientId) return;
    updateIngredientMutation.mutate({
      ingredientId: editingIngredientId,
      data: editIngredientData
    });
  };

  const handleCancelEdit = () => {
    setEditingIngredientId(null);
    setEditIngredientData({
      ingredient_name: '',
      quantity_used: '',
      unit: 'kg',
      cost_per_unit: '',
      pack_size: '',
      pack_price: ''
    });
  };

  // Enhanced print handler
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast.error('Unable to open print window. Please check your browser settings.');
      return;
    }
    
    const dateText = format(date, 'MMMM dd, yyyy');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Production Report - ${dateText}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
            h3 { color: #666; margin: 20px 0 10px 0; }
            table { border-collapse: collapse; width: 100%; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .no-print { display: none; }
            @media print { .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1>Production Report</h1>
            <div class="no-print">
              <button onclick="window.print()">Print</button>
              <button onclick="window.close()">Close</button>
            </div>
          </div>
          
          <div class="summary">
            <strong>Report Date:</strong> ${dateText}<br>
            <strong>Total Batches:</strong> ${productionBatches.length}<br>
            <strong>Total Units Produced:</strong> ${calculateDailyProduction()}<br>
            <strong>Total Production Cost:</strong> R${productionBatches.reduce((sum, batch) => sum + (batch.total_ingredient_cost || 0), 0).toFixed(2)}<br>
            <strong>Generated:</strong> ${new Date().toLocaleString()}
          </div>
          
          <h3>Production Batches</h3>
          <table>
            <thead>
              <tr>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Staff Member</th>
                <th>Recipe</th>
                <th>Batch Cost</th>
                <th>Cost per Unit</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${productionBatches.map(batch => `
                <tr>
                  <td>${batch.product_code}</td>
                  <td>${batch.product_name}</td>
                  <td>${batch.quantity_produced}</td>
                  <td>${batch.staff_name}</td>
                  <td>${batch.recipe_name || 'No Recipe'}</td>
                  <td>R${(batch.total_ingredient_cost || 0).toFixed(2)}</td>
                  <td>R${(batch.cost_per_unit || 0).toFixed(2)}</td>
                  <td>${batch.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${showStaffAnalytics && staffStats.length > 0 ? `
            <h3>Staff Production Summary (Last ${comparisonDays} Days)</h3>
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Total Batches</th>
                  <th>Total Units</th>
                  <th>Avg Units/Batch</th>
                </tr>
              </thead>
              <tbody>
                ${staffStats.map(stat => `
                  <tr>
                    <td>${stat.staff_name}</td>
                    <td>${stat.total_batches}</td>
                    <td>${stat.total_units}</td>
                    <td>${stat.total_batches > 0 ? (stat.total_units / stat.total_batches).toFixed(1) : '0.0'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          ${activeBatchId && batchIngredients.length > 0 ? `
            <h3>Ingredients for Selected Batch</h3>
            <table>
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Cost per Unit</th>
                  <th>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                ${batchIngredients.map(ingredient => `
                  <tr>
                    <td>${ingredient.ingredient_name}</td>
                    <td>${ingredient.quantity_used}</td>
                    <td>${ingredient.unit}</td>
                    <td>R${ingredient.cost_per_unit.toFixed(2)}</td>
                    <td>R${(ingredient.quantity_used * ingredient.cost_per_unit).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  // Add loading state for recipe fetching to handle async updating
  const [fetchingDefaultRecipe, setFetchingDefaultRecipe] = useState(false);

  // When user selects a product, automatically fetch default recipe for it
  const handleProductChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value;
    setProductionData(prev => ({
      ...prev,
      product_id: productId,
      // Reset recipe_id for a new product
      recipe_id: '' 
    }));

    if (!productId) return;
    try {
      setFetchingDefaultRecipe(true);
      // Try to find a default recipe for this product
      const { data: relationData, error: relationError } = await supabase
        .from('product_recipes')
        .select('recipe_id')
        .eq('product_id', productId)
        .eq('is_default', true)
        .maybeSingle();
      setFetchingDefaultRecipe(false);

      if (relationError) {
        // optionally toast or log, but don't block
        return;
      }
      if (relationData && relationData.recipe_id) {
        setProductionData(prev => ({
          ...prev,
          product_id: productId,
          recipe_id: relationData.recipe_id
        }));
      }
    } catch {
      setFetchingDefaultRecipe(false);
      // fail silently, allow user to pick manually
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header Section */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Daily Production Tracking</h1>
        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">Production Staff</span>
      </div>
      
      {/* Date Picker and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal w-[280px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(selectedDate) => selectedDate && setDate(selectedDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <div className="text-sm text-gray-600">
            {productionBatches.length} batches | {calculateDailyProduction()} units
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowStaffAnalytics(!showStaffAnalytics)}
            className="flex items-center gap-2"
          >
            <BarChart2 className="h-4 w-4" />
            {showStaffAnalytics ? 'Hide Staff Analytics' : 'Staff Analytics'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center gap-2"
          >
            <BarChart2 className="h-4 w-4" />
            {showComparison ? 'Hide Comparison' : 'Show Comparison'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Staff Analytics Chart */}
      {showStaffAnalytics && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span>Staff Production Analytics</span>
              <select 
                value={comparisonDays}
                onChange={(e) => setComparisonDays(Number(e.target.value))}
                className="p-2 border rounded text-sm w-full sm:w-auto"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="units" fill="#22c55e" name="Total Units Produced" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Staff Stats Table */}
            {staffStats.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Total Batches</TableHead>
                    <TableHead>Total Units</TableHead>
                    <TableHead>Avg Units/Batch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffStats.map((stat, index) => (
                    <TableRow key={stat.staff_name} className={index === 0 ? 'bg-green-50' : ''}>
                      <TableCell className="font-medium">
                        {stat.staff_name}
                        {index === 0 && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Top Producer</span>}
                      </TableCell>
                      <TableCell>{stat.total_batches}</TableCell>
                      <TableCell>{stat.total_units}</TableCell>
                      <TableCell>{stat.total_batches > 0 ? (stat.total_units / stat.total_batches).toFixed(1) : '0.0'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Production Comparison Chart */}
      {showComparison && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span>Production Comparison</span>
              <select 
                value={comparisonDays}
                onChange={(e) => setComparisonDays(Number(e.target.value))}
                className="p-2 border rounded text-sm w-full sm:w-auto"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="production" fill="#3b82f6" name="Daily Production (units)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production Batch Form */}
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
              <label className="block text-sm font-medium mb-1">Recipe (Optional)</label>
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
              {fetchingDefaultRecipe && (
                <span className="text-xs text-gray-500">Loading default recipe...</span>
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
              
              {/* Recipe Ingredients Preview */}
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
              onClick={() => createBatchMutation.mutate()}
              disabled={createBatchMutation.isPending || !productionData.product_id || !productionData.quantity_produced || !productionData.staff_id}
            >
              <Plus className="mr-2 h-4 w-4" />
              {createBatchMutation.isPending ? 'Adding...' : 'Add Batch'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Production Batches List */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Today's Production Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {productionBatches.length === 0 ? (
            <p className="text-gray-500">No production batches recorded for today</p>
          ) : (
            <div className="space-y-4">
              {productionBatches.map((batch) => (
                <div key={batch.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{batch.product_code} - {batch.product_name}</h3>
                      {batch.recipe_name && batch.recipe_name !== 'No Recipe' && (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-blue-600">Recipe: {batch.recipe_name}</p>
                          {batch.recipe_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingRecipeId(batch.recipe_id)}
                              className="h-6 px-2 text-xs"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit Recipe
                            </Button>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-gray-600">
                        {batch.quantity_produced} units • {batch.staff_name}
                      </p>
                      {batch.total_ingredient_cost && batch.total_ingredient_cost > 0 && (
                        <p className="text-sm text-green-600">
                          Total Cost: R{batch.total_ingredient_cost.toFixed(2)} • 
                          Cost per Unit: R{batch.cost_per_unit?.toFixed(2) || '0.00'}
                        </p>
                      )}
                      {batch.notes && (
                        <p className="text-sm mt-1 text-gray-600">Notes: {batch.notes}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(batch.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveBatchId(activeBatchId === batch.id ? null : batch.id)}
                      >
                        {activeBatchId === batch.id ? 'Hide Ingredients' : 'Show Ingredients'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this production batch?')) {
                            deleteBatchMutation.mutate(batch.id);
                          }
                        }}
                        disabled={deleteBatchMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {activeBatchId === batch.id && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-sm font-medium mb-2">Ingredients Used</h4>
                      {batchIngredients.length === 0 ? (
                        <p className="text-gray-500 text-sm">No ingredients recorded for this batch</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ingredient</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead>Cost per Unit</TableHead>
                              <TableHead>Total Cost</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {batchIngredients.map((ingredient) => (
                              <TableRow key={ingredient.id}>
                                {editingIngredientId === ingredient.id ? (
                                  <>
                                    <TableCell>
                                      <Input
                                        value={editIngredientData.ingredient_name}
                                        onChange={(e) => setEditIngredientData({
                                          ...editIngredientData,
                                          ingredient_name: e.target.value
                                        })}
                                        className="w-full"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={editIngredientData.quantity_used}
                                        onChange={(e) => setEditIngredientData({
                                          ...editIngredientData,
                                          quantity_used: e.target.value
                                        })}
                                        className="w-24"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <select
                                        value={editIngredientData.unit}
                                        onChange={(e) => setEditIngredientData({
                                          ...editIngredientData,
                                          unit: e.target.value
                                        })}
                                        className="w-20 p-1 border rounded"
                                      >
                                        <option value="kg">kg</option>
                                        <option value="g">g</option>
                                        <option value="L">L</option>
                                        <option value="ml">ml</option>
                                        <option value="unit">unit</option>
                                      </select>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={editIngredientData.cost_per_unit}
                                        onChange={(e) => setEditIngredientData({
                                          ...editIngredientData,
                                          cost_per_unit: e.target.value
                                        })}
                                        className="w-24"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={editIngredientData.pack_size}
                                        onChange={(e) => setEditIngredientData({
                                          ...editIngredientData,
                                          pack_size: e.target.value
                                        })}
                                        className="w-24"
                                        placeholder="Pack Size"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={editIngredientData.pack_price}
                                        onChange={(e) => setEditIngredientData({
                                          ...editIngredientData,
                                          pack_price: e.target.value
                                        })}
                                        className="w-24"
                                        placeholder="Pack Price"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      R{(Number(editIngredientData.quantity_used) * Number(editIngredientData.cost_per_unit)).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={handleUpdateIngredient}
                                          disabled={updateIngredientMutation.isPending}
                                        >
                                          <Save className="h-4 w-4 text-green-500" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={handleCancelEdit}
                                        >
                                          <X className="h-4 w-4 text-gray-500" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </>
                                ) : (
                                  <>
                                    <TableCell>{ingredient.ingredient_name}</TableCell>
                                    <TableCell>{ingredient.quantity_used}</TableCell>
                                    <TableCell>{ingredient.unit}</TableCell>
                                    <TableCell>R{ingredient.cost_per_unit.toFixed(2)}</TableCell>
                                    <TableCell>{ingredient.pack_size ? ingredient.pack_size : "-"}</TableCell>
                                    <TableCell>{ingredient.pack_price ? "R"+ingredient.pack_price.toFixed(2) : "-"}</TableCell>
                                    <TableCell>R{(ingredient.quantity_used * ingredient.cost_per_unit).toFixed(2)}</TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
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
                                      </div>
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      
                      <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-medium mb-2">Add New Ingredient</h4>
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                          <div className="md:col-span-2">
                            <Input
                              value={ingredientData.ingredient_name}
                              onChange={(e) => setIngredientData({...ingredientData, ingredient_name: e.target.value})}
                              placeholder="Ingredient name"
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              value={ingredientData.quantity_used}
                              onChange={(e) => setIngredientData({...ingredientData, quantity_used: e.target.value})}
                              placeholder="Quantity"
                            />
                          </div>
                          <div>
                            <select
                              value={ingredientData.unit}
                              onChange={(e) => setIngredientData({...ingredientData, unit: e.target.value})}
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
                            <Input
                              type="number"
                              value={ingredientData.cost_per_unit}
                              onChange={(e) => setIngredientData({...ingredientData, cost_per_unit: e.target.value})}
                              placeholder="Cost per unit"
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              value={ingredientData.pack_size}
                              onChange={(e) => setIngredientData({...ingredientData, pack_size: e.target.value})}
                              placeholder="Pack Size"
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              value={ingredientData.pack_price}
                              onChange={(e) => setIngredientData({...ingredientData, pack_price: e.target.value})}
                              placeholder="Pack Price"
                            />
                          </div>
                        </div>
                        <div className="mt-2">
                          <Button 
                            onClick={() => addIngredientMutation.mutate()}
                            disabled={addIngredientMutation.isPending || !ingredientData.ingredient_name || !ingredientData.quantity_used}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {addIngredientMutation.isPending ? 'Adding...' : 'Add Ingredient'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Recipe Edit Modal */}
      <RecipeEditModal
        isOpen={!!editingRecipeId}
        onClose={() => setEditingRecipeId(null)}
        recipeId={editingRecipeId}
      />
      
      <Navigation />
    </div>
  );
};

export default ProductionPage;
