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
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ProductionItem {
  id: string;
  product_name: string;
  category: string;
  quantity: number;
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [productionInput, setProductionInput] = useState({
    product_id: '',
    product_name: '',
    category: '',
    quantity: 0,
    staff_name: 'Elton' // Default staff for demo
  });

  // Fetch products for dropdown
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

  // Fetch today's production
  const { data: todaysProduction = [] } = useQuery({
    queryKey: ['todays_production', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('production_logs')
        .select('*')
        .eq('production_date', dateStr)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProductionItem[];
    }
  });

  // Add production mutation
  const addProduction = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !productionInput.product_id || productionInput.quantity <= 0) {
        throw new Error('Please fill all fields');
      }

      const { error } = await supabase
        .from('production_logs')
        .insert({
          product_name: productionInput.product_name,
          category: productionInput.category,
          quantity: productionInput.quantity,
          staff_name: productionInput.staff_name,
          production_date: format(selectedDate, 'yyyy-MM-dd')
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['todays_production']);
      setProductionInput(prev => ({
        ...prev,
        quantity: 0,
        product_id: '',
        product_name: '',
        category: ''
      }));
      toast({
        title: "Success",
        description: "Production logged successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleProductSelect = (productId: string) => {
    const selected = products.find(p => p.id === productId);
    if (selected) {
      setProductionInput({
        ...productionInput,
        product_id: productId,
        product_name: selected.name,
        category: selected.category
      });
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Daily Production Tracking</h1>
      
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
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Product Selection */}
            <select
              className="p-2 border rounded"
              value={productionInput.product_id}
              onChange={(e) => handleProductSelect(e.target.value)}
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
              min="0"
              value={productionInput.quantity}
              onChange={(e) => setProductionInput({
                ...productionInput,
                quantity: Number(e.target.value)
              })}
            />

            {/* Staff (hardcoded for demo) */}
            <Input
              placeholder="Staff Name"
              value={productionInput.staff_name}
              onChange={(e) => setProductionInput({
                ...productionInput,
                staff_name: e.target.value
              })}
            />
          </div>

          <Button 
            onClick={() => addProduction.mutate()}
            disabled={addProduction.isLoading}
          >
            {addProduction.isLoading ? "Logging..." : "Log Production"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Today's Production - {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaysProduction.length > 0 ? (
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
                {todaysProduction.map(item => (
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
            <p className="text-gray-500">No production logged for this date yet</p>
          )}
        </CardContent>
      </Card>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="font-semibold text-blue-800">Production Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <div className="bg-white p-3 rounded shadow">
            <h3 className="text-sm text-gray-500">Total Items Produced</h3>
            <p className="text-2xl font-bold">
              {todaysProduction.reduce((sum, item) => sum + item.quantity, 0)}
            </p>
          </div>
          <div className="bg-white p-3 rounded shadow">
            <h3 className="text-sm text-gray-500">Unique Products</h3>
            <p className="text-2xl font-bold">
              {new Set(todaysProduction.map(item => item.product_name)).size}
            </p>
          </div>
          <div className="bg-white p-3 rounded shadow">
            <h3 className="text-sm text-gray-500">Staff Members</h3>
            <p className="text-2xl font-bold">
              {new Set(todaysProduction.map(item => item.staff_name)).size}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionPage;
