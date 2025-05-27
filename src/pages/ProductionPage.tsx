import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, Printer, BarChart2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useReactToPrint } from 'react-to-print';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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

interface DailyProduction {
  date: string;
  total_production: number;
}

const ProductionPage = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonDays, setComparisonDays] = useState(7);
  const reportRef = useRef<HTMLDivElement>(null);
  
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

  // Fetch historical production data for comparison
  const { data: historicalProduction = [] } = useQuery({
    queryKey: ['historical_production', comparisonDays],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_batches')
        .select('production_date, quantity_produced')
        .gte('production_date', format(subDays(new Date(), comparisonDays), 'yyyy-MM-dd')
        .order('production_date', { ascending: true });
      
      if (error) throw error;
      
      // Group by date and sum quantities
      const grouped = data.reduce((acc: Record<string, number>, item: any) => {
        const date = item.production_date;
        acc[date] = (acc[date] || 0) + item.quantity_produced;
        return acc;
      }, {});
      
      return Object.entries(grouped).map(([date, total_production]) => ({
        date,
        total_production
      })) as DailyProduction[];
    },
    enabled: showComparison
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
      queryClient.invalidateQueries({ queryKey: ['historical_production'] });
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

  // Prepare chart data
  const chartData = {
    labels: historicalProduction.map(item => format(new Date(item.date), 'MMM d')),
    datasets: [
      {
        label: 'Daily Production (units)',
        data: historicalProduction.map(item => item.total_production),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Production Comparison (Last ${comparisonDays} Days)`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Units Produced',
        },
      },
    },
  };

  // Handle print
  const handlePrint = useReactToPrint({
    content: () => reportRef.current,
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body {
          padding: 20px;
        }
        .no-print {
          display: none !important;
        }
        .print-section {
          break-inside: avoid;
        }
      }
    `,
  });

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Daily Production Tracking</h1>
        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">Production Staff</span>
      </div>
      
      {/* Date Picker and Actions */}
      <div className="flex items-center justify-between gap-4">
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
        
        <div className="flex gap-2">
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
            className="flex items-center gap-2 no-print"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Printable Report */}
      <div className="hidden">
        <div ref={reportRef} className="p-6 bg-white">
          <h1 className="text-2xl font-bold mb-4">Production Report - {date && format(date, 'MMMM d, yyyy')}</h1>
          
          <div className="mb-6 print-section">
            <h2 className="text-xl font-semibold mb-2">Summary</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="border p-3 rounded">
                <div className="text-sm text-gray-500">Total Batches</div>
                <div className="text-2xl font-bold">{productionBatches.length}</div>
              </div>
              <div className="border p-3 rounded">
                <div className="text-sm text-gray-500">Total Production</div>
                <div className="text-2xl font-bold">{calculateDailyProduction()} units</div>
              </div>
              <div className="border p-3 rounded">
                <div className="text-sm text-gray-500">Active Batch Ingredients</div>
                <div className="text-2xl font-bold">R{calculateTotalCost().toFixed(2)}</div>
              </div>
            </div>
          </div>
          
          {productionBatches.length > 0 && (
            <div className="mb-6 print-section">
              <h2 className="text-xl font-semibold mb-2">Production Batches</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left border">Product</th>
                    <th className="p-2 text-left border">Code</th>
                    <th className="p-2 text-left border">Quantity</th>
                    <th className="p-2 text-left border">Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {productionBatches.map(batch => (
                    <tr key={batch.id} className="border-b">
                      <td className="p-2 border">{batch.product_name}</td>
                      <td className="p-2 border">{batch.product_code}</td>
                      <td className="p-2 border">{batch.quantity_produced}</td>
                      <td className="p-2 border">{batch.staff_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {activeBatchId && batchIngredients.length > 0 && (
            <div className="print-section">
              <h2 className="text-xl font-semibold mb-2">Ingredients for Selected Batch</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left border">Ingredient</th>
                    <th className="p-2 text-left border">Quantity</th>
                    <th className="p-2 text-left border">Unit Cost</th>
                    <th className="p-2 text-left border">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {batchIngredients.map(ingredient => (
                    <tr key={ingredient.id} className="border-b">
                      <td className="p-2 border">{ingredient.ingredient_name}</td>
                      <td className="p-2 border">{ingredient.quantity_used} {ingredient.unit}</td>
                      <td className="p-2 border">R{ingredient.cost_per_unit.toFixed(2)}/{ingredient.unit}</td>
                      <td className="p-2 border">R{(ingredient.quantity_used * ingredient.cost_per_unit).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="p-2 border" colSpan={3}>Total Ingredients Cost</td>
                    <td className="p-2 border">R{calculateTotalCost().toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          
          <div className="mt-6 text-sm text-gray-500">
            Report generated on {format(new Date(), 'PPPPp')}
          </div>
        </div>
      </div>

      {/* Production Comparison Chart */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Production Comparison</span>
              <select 
                value={comparisonDays}
                onChange={(e) => setComparisonDays(Number(e.target.value))}
                className="p-2 border rounded text-sm"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      )}

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
