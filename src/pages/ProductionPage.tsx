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
    staff_name: 'Name here ',
    notes: ''
  });
  
  // Ingredient form state
  const [ingredientData, setIngredientData] = useState({
    ingredient_name: '',
    quantity_used: '',
    unit: 'kg',
    cost_per_unit: ''
  });

  // Fetch production batches
  const { data: productionBatches = [] } = useQuery<ProductionBatch[]>({
    queryKey: ['production_batches', date?.toISOString()],
    queryFn: async () => {
      if (!date) return [];
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('production_batches')
        .select('*, products(name)')
        .gte('production_date', startOfDay.toISOString())
        .lte('production_date', endOfDay.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(batch => ({
        ...batch,
        product_name: (batch.products as any)?.name || 'Unknown'
      }));
    }
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
    queryKey: ['historical_production', comparisonDays],
    queryFn: async () => {
      const endDate = date || new Date();
      const startDate = subDays(endDate, comparisonDays);
      
      const { data, error } = await supabase
        .from('daily_production')
        .select('date, total_production')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data.map(item => ({
        date: item.date,
        total_production: item.total_production
      }));
    },
    enabled: showComparison
  });

  // Create production batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async () => {
      if (!date || !productionData.product_id || !productionData.quantity_produced) {
        throw new Error('Please fill all required fields');
      }
      
      const { data, error } = await supabase
        .from('production_batches')
        .insert({
          product_id: productionData.product_id,
          quantity_produced: Number(productionData.quantity_produced),
          production_date: date.toISOString(),
          staff_name: productionData.staff_name,
          notes: productionData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
      setProductionData({
        product_id: '',
        quantity_produced: '',
        staff_name: 'Who Produce?',
        notes: ''
      });
      toast.success('Production batch created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create batch: ' + error.message);
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
          cost_per_unit: Number(ingredientData.cost_per_unit) || 0
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
        cost_per_unit: ''
      });
      toast.success('Ingredient added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add ingredient: ' + error.message);
    }
  });

  // Delete ingredient mutation
  const deleteIngredientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('production_ingredients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_ingredients'] });
      toast.success('Ingredient deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete ingredient: ' + error.message);
    }
  });

  // Delete batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete all ingredients
      const { error: ingredientsError } = await supabase
        .from('production_ingredients')
        .delete()
        .eq('batch_id', id);
      
      if (ingredientsError) throw ingredientsError;
      
      // Then delete the batch
      const { error } = await supabase
        .from('production_batches')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
      setActiveBatchId(null);
      toast.success('Batch deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete batch: ' + error.message);
    }
  });

  // Calculate daily production total
  const calculateDailyProduction = () => {
    return productionBatches.reduce((total, batch) => total + batch.quantity_produced, 0);
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
    maintainAspectRatio: false,
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
      @page { size: A4; margin: 10mm; }
      @media print {
        body { padding: 20px; background: white; }
        .no-print { display: none !important; }
        .print-section { break-inside: avoid; }
      }
    `,
  });

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header Section */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Daily Production Tracking</h1>
        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">Production Staff</span>
      </div>
      
      {/* Date Picker and Actions - Fixed layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal w-[280px]">
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
            {productionBatches.length} batches | {calculateDailyProduction()} units
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

      {/* Production Comparison Chart - Fixed responsive container */}
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
              <Bar 
                data={chartData} 
                options={chartOptions}
                redraw={true}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Printable Report - Fixed hidden container */}
      <div style={{ display: 'none' }}>
        <div ref={reportRef} className="p-6 bg-white">
          <h1 className="text-2xl font-bold mb-4">Production Report</h1>
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Summary</h2>
            <p>Date: {date ? format(date, "PPPP") : 'N/A'}</p>
            <p>Total Batches: {productionBatches.length}</p>
            <p>Total Units Produced: {calculateDailyProduction()}</p>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Production Batches</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Staff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>{batch.product_name}</TableCell>
                    <TableCell>{batch.quantity_produced}</TableCell>
                    <TableCell>{batch.staff_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {activeBatchId && batchIngredients.length > 0 && (
            <div className="mb-6 print-section">
              <h2 className="text-lg font-semibold mb-2">Ingredients for Selected Batch</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchIngredients.map((ingredient) => (
                    <TableRow key={ingredient.id}>
                      <TableCell>{ingredient.ingredient_name}</TableCell>
                      <TableCell>{ingredient.quantity_used}</TableCell>
                      <TableCell>{ingredient.unit}</TableCell>
                      <TableCell>${(ingredient.quantity_used * ingredient.cost_per_unit).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="text-xs text-gray-500 mt-8">
            Generated on {format(new Date(), "PPPPp")}
          </div>
        </div>
      </div>

      {/* Production Batch Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Production Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Product</label>
              <select
                value={productionData.product_id}
                onChange={(e) => setProductionData({...productionData, product_id: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <Input
                type="number"
                value={productionData.quantity_produced}
                onChange={(e) => setProductionData({...productionData, quantity_produced: e.target.value})}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Staff Name</label>
              <Input
                value={productionData.staff_name}
                onChange={(e) => setProductionData({...productionData, staff_name: e.target.value})}
                placeholder="Staff name"
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
          <div className="mt-4">
            <Button 
              onClick={() => createBatchMutation.mutate()}
              disabled={!productionData.product_id || !productionData.quantity_produced}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Batch
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
                      <h3 className="font-medium">{batch.product_name}</h3>
                      <p className="text-sm text-gray-600">
                        {batch.quantity_produced} units • {batch.staff_name}
                      </p>
                      {batch.notes && (
                        <p className="text-sm mt-1 text-gray-600">Notes: {batch.notes}</p>
                      )}
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
                        onClick={() => deleteBatchMutation.mutate(batch.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {activeBatchId === batch.id && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Ingredients</h4>
                      {batchIngredients.length === 0 ? (
                        <p className="text-gray-500 text-sm">No ingredients recorded for this batch</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ingredient</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead>Cost</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {batchIngredients.map((ingredient) => (
                              <TableRow key={ingredient.id}>
                                <TableCell>{ingredient.ingredient_name}</TableCell>
                                <TableCell>{ingredient.quantity_used}</TableCell>
                                <TableCell>{ingredient.unit}</TableCell>
                                <TableCell>${(ingredient.quantity_used * ingredient.cost_per_unit).toFixed(2)}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteIngredientMutation.mutate(ingredient.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      
                      <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-medium mb-2">Add New Ingredient</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                          <div className="flex gap-2">
                            <select
                              value={ingredientData.unit}
                              onChange={(e) => setIngredientData({...ingredientData, unit: e.target.value})}
                              className="flex-1 p-2 border rounded"
                            >
                              <option value="kg">kg</option>
                              <option value="g">g</option>
                              <option value="L">L</option>
                              <option value="ml">ml</option>
                              <option value="unit">unit</option>
                            </select>
                            <Button 
                              onClick={() => addIngredientMutation.mutate()}
                              disabled={!ingredientData.ingredient_name || !ingredientData.quantity_used}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Input
                            type="number"
                            value={ingredientData.cost_per_unit}
                            onChange={(e) => setIngredientData({...ingredientData, cost_per_unit: e.target.value})}
                            placeholder="Cost per unit (optional)"
                            className="w-full md:w-1/2"
                          />
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
      
      <Navigation />
    </div>
  );
};

export default ProductionPage;
