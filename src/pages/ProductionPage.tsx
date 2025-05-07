
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';

// Types
interface ProductionItem {
  id: string;
  product_id: string;
  product_name: string;
  category: string;
  quantity: number;
  staff_id: string;
  staff_name: string;
  production_date: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
}

const ProductionPage = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [productionData, setProductionData] = useState({
    product_id: '',
    quantity: '',
    staff_name: 'Elton' // Default staff for demo
  });

  // 1. Fetch Products
  const { data: products = [] } = useQuery({
    queryKey: ['production_products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    }
  });

  // 2. Fetch Daily Production
  const { data: dailyProduction = [] } = useQuery({
    queryKey: ['daily_production', date ? date.toISOString() : null],
    queryFn: async () => {
      if (!date) return [];
      
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('production_logs')
        .select('*')
        .eq('production_date', dateStr)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProductionItem[];
    }
  });

  // 3. Add Production Mutation
  const addProduction = useMutation({
    mutationFn: async () => {
      if (!date || !productionData.product_id || !productionData.quantity) {
        throw new Error('Please fill all fields');
      }

      const selectedProduct = products.find(p => p.id === productionData.product_id);
      if (!selectedProduct) throw new Error('Product not found');

      const { error } = await supabase
        .from('production_logs')
        .insert({
          product_id: productionData.product_id,
          product_name: selectedProduct.name,
          category: selectedProduct.category,
          quantity: Number(productionData.quantity),
          staff_name: productionData.staff_name,
          staff_id: 'staff_123', // In real app, use auth user ID
          production_date: format(date, 'yyyy-MM-dd')
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_production'] });
      setProductionData(prev => ({ ...prev, quantity: '', product_id: '' }));
      toast("Production logged successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Daily Production Tracking</h1>
        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">Kitchen Staff</span>
      </div>
      
      {/* Production Logging Card */}
      <Card>
        <CardHeader>
          <CardTitle>Log Production</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Picker */}
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

            {/* Product Selection */}
            <select
              className="p-2 border rounded"
              value={productionData.product_id}
              onChange={(e) => setProductionData({...productionData, product_id: e.target.value})}
            >
              <option value="">Select Product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.category})
                </option>
              ))}
            </select>

            {/* Quantity Input */}
            <Input
              type="number"
              placeholder="Quantity"
              value={productionData.quantity}
              onChange={(e) => setProductionData({...productionData, quantity: e.target.value})}
            />

            {/* Staff Input */}
            <Input
              placeholder="Staff Name"
              value={productionData.staff_name}
              onChange={(e) => setProductionData({...productionData, staff_name: e.target.value})}
            />
          </div>

          <Button 
            onClick={() => addProduction.mutate()}
            disabled={addProduction.isPending}
          >
            {addProduction.isPending ? "Logging..." : "Log Production"}
          </Button>
        </CardContent>
      </Card>

      {/* Daily Production Summary */}
      <Card>
        <CardHeader>
          <CardTitle>
            Production for {date && format(date, 'MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyProduction.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Staff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyProduction.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.staff_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500">No production logged for this date</p>
          )}
        </CardContent>
      </Card>

      {/* Production Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Produced</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {dailyProduction.reduce((sum, item) => sum + item.quantity, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Unique Products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Set(dailyProduction.map(item => item.product_name)).size}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Staff Count</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Set(dailyProduction.map(item => item.staff_name)).size}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Navigation />
    </div>
  );
};

export default ProductionPage;
