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
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Types
interface ProductionBatch {
  id: string;
  product_id: string;
  product_name: string;
  quantity_produced: number;
  production_date: string;
  staff_name: string;
  staff_id?: string;
  notes?: string;
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

interface StaffMember {
  id: number;
  name: string;
  department_id?: number;
  departments?: {
    name: string;
  };
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
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showStaffAnalytics, setShowStaffAnalytics] = useState(false);
  const [comparisonDays, setComparisonDays] = useState(7);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Production form state
  const [productionData, setProductionData] = useState({
    product_id: '',
    quantity_produced: '',
    staff_id: '',
    notes: ''
  });
  
  // Ingredient form state
  const [ingredientData, setIngredientData] = useState({
    ingredient_name: '',
    quantity_used: '',
    unit: 'kg',
    cost_per_unit: ''
  });

  // Fetch staff members from staff table
  const { data: staffMembers = [] } = useQuery<StaffMember[]>({
    queryKey: ['staff_members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          id,
          name,
          department_id,
          departments:department_id (name)
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
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

  // Fetch staff production analytics
  const { data: staffStats = [] } = useQuery<StaffProductionStats[]>({
    queryKey: ['staff_production_stats', comparisonDays],
    queryFn: async () => {
      const endDate = date || new Date();
      const startDate = subDays(endDate, comparisonDays);
      
      const { data, error } = await supabase
        .from('production_batches')
        .select('staff_name, quantity_produced')
        .gte('production_date', startDate.toISOString())
        .lte('production_date', endDate.toISOString());
      
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
    queryKey: ['historical_production', comparisonDays],
    queryFn: async () => {
      const endDate = date || new Date();
      const startDate = subDays(endDate, comparisonDays);
      
      const { data, error } = await supabase
        .from('production_batches')
        .select('production_date, quantity_produced')
        .gte('production_date', startDate.toISOString())
        .lte('production_date', endDate.toISOString());
      
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

  // Create production batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async () => {
      if (!productionData.product_id || !productionData.quantity_produced || !productionData.staff_id || !date) {
        throw new Error('Please fill all required fields');
      }

      // Get staff name from staff_id
      const selectedStaff = staffMembers.find(s => s.id.toString() === productionData.staff_id);
      if (!selectedStaff) {
        throw new Error('Selected staff member not found');
      }

      const { data, error } = await supabase
        .from('production_batches')
        .insert({
          product_id: productionData.product_id,
          quantity_produced: Number(productionData.quantity_produced),
          production_date: date.toISOString(),
          staff_name: selectedStaff.name,
          staff_id: productionData.staff_id,
          notes: productionData.notes
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_batches'] });
      queryClient.invalidateQueries({ queryKey: ['staff_production_stats'] });
      setProductionData({
        product_id: '',
        quantity_produced: '',
        staff_id: '',
        notes: ''
      });
      toast('Production batch created successfully!');
    },
    onError: (error: Error) => {
      toast(error.message);
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
      toast('Production batch deleted successfully!');
    },
    onError: (error: Error) => {
      toast(error.message);
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
      toast('Ingredient added successfully!');
    },
    onError: (error: Error) => {
      toast(error.message);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_ingredients'] });
      toast('Ingredient removed successfully!');
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Enhanced print handler
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast('Unable to open print window. Please check your browser settings.');
      return;
    }
    
    const dateText = date ? format(date, 'MMMM dd, yyyy') : 'All Dates';
    
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
            <strong>Generated:</strong> ${new Date().toLocaleString()}
          </div>
          
          <h3>Production Batches</h3>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Staff Member</th>
                <th>Time</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${productionBatches.map(batch => `
                <tr>
                  <td>${batch.product_name}</td>
                  <td>${batch.quantity_produced}</td>
                  <td>${batch.staff_name}</td>
                  <td>${new Date(batch.created_at).toLocaleTimeString()}</td>
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
                    <td>${(stat.total_units / stat.total_batches).toFixed(1)}</td>
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
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => printWindow.focus(), 500);
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
                      <TableCell>{(stat.total_units / stat.total_batches).toFixed(1)}</TableCell>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
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
              <label className="block text-sm font-medium mb-1">Staff Member</label>
              <select
                value={productionData.staff_id}
                onChange={(e) => setProductionData({...productionData, staff_id: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option value="">Select staff member</option>
                {staffMembers.map((staff) => (
                  <option key={staff.id} value={staff.id.toString()}>
                    {staff.name} {staff.departments?.name && `(${staff.departments.name})`}
                  </option>
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
                      <h3 className="font-medium">{batch.product_name}</h3>
                      <p className="text-sm text-gray-600">
                        {batch.quantity_produced} units • {batch.staff_name}
                      </p>
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
                                <TableCell>{ingredient.ingredient_name}</TableCell>
                                <TableCell>{ingredient.quantity_used}</TableCell>
                                <TableCell>{ingredient.unit}</TableCell>
                                <TableCell>R{ingredient.cost_per_unit.toFixed(2)}</TableCell>
                                <TableCell>R{(ingredient.quantity_used * ingredient.cost_per_unit).toFixed(2)}</TableCell>
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
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
      
      <Navigation />
    </div>
  );
};

export default ProductionPage;
