
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { format, addDays, isBefore } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';

// Types
interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  expiry_date: string;
  batch_number?: string;
  created_at?: string;
  updated_at?: string;
}

interface Product {
  id: string;
  name: string;
}

const StockPage = () => {
  const queryClient = useQueryClient();
  const today = new Date();
  
  const [expiryDate, setExpiryDate] = useState<Date>(addDays(today, 14)); // Default 14 days from now
  const [stockData, setStockData] = useState({
    product_id: '',
    quantity: 1,
    batch_number: '',
  });

  // 1. Fetch Products
  const { data: products = [] } = useQuery({
    queryKey: ['stock_products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    }
  });

  // 2. Fetch Stock Items
  const { data: stockItems = [], isLoading: isLoadingStock } = useQuery({
    queryKey: ['stock_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock')
        .select(`
          id, 
          product_id,
          product_name,
          quantity,
          expiry_date,
          batch_number,
          created_at,
          updated_at
        `)
        .order('expiry_date', { ascending: true });
      
      if (error) throw error;
      return data as StockItem[];
    }
  });

  // 3. Add Stock Item Mutation
  const addStockItem = useMutation({
    mutationFn: async () => {
      if (!stockData.product_id || !stockData.quantity || !expiryDate) {
        throw new Error('Please fill all required fields');
      }

      const selectedProduct = products.find(p => p.id === stockData.product_id);
      if (!selectedProduct) throw new Error('Product not found');

      const { error } = await supabase
        .from('stock')
        .insert({
          product_id: stockData.product_id,
          product_name: selectedProduct.name,
          quantity: stockData.quantity,
          expiry_date: format(expiryDate, 'yyyy-MM-dd'),
          batch_number: stockData.batch_number || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock_items'] });
      setStockData({
        product_id: '',
        quantity: 1,
        batch_number: '',
      });
      toast("Stock item added successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // 4. Update Stock Quantity Mutation
  const updateStockQuantity = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity < 0) {
        throw new Error('Quantity cannot be negative');
      }

      const { error } = await supabase
        .from('stock')
        .update({ 
          quantity: quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock_items'] });
      toast("Stock quantity updated!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  const isNearExpiry = (expiryDate: string): boolean => {
    const expiry = new Date(expiryDate);
    const warningDate = addDays(today, 7); // 7 days warning
    return isBefore(expiry, warningDate) && !isBefore(expiry, today);
  };

  const isExpired = (expiryDate: string): boolean => {
    const expiry = new Date(expiryDate);
    return isBefore(expiry, today);
  };

  const handleQuantityChange = (id: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity >= 0) {
      updateStockQuantity.mutate({ id, quantity: newQuantity });
    }
  };

  // Calculate stock statistics
  const totalItems = stockItems.reduce((sum, item) => sum + item.quantity, 0);
  const expiringItems = stockItems.filter(item => isNearExpiry(item.expiry_date))
    .reduce((sum, item) => sum + item.quantity, 0);
  const expiredItems = stockItems.filter(item => isExpired(item.expiry_date))
    .reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <h1 className="text-2xl font-bold">Stock Management</h1>
      
      {/* Stock Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalItems} items</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-700">{expiringItems} items</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Expired Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-700">{expiredItems} items</p>
            {expiredItems > 0 && (
              <div className="flex items-center mt-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span>Needs attention</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Add Stock Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Stock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Selection */}
            <div>
              <label className="block text-sm font-medium mb-1">Product</label>
              <select
                className="w-full p-2 border rounded"
                value={stockData.product_id}
                onChange={(e) => setStockData({...stockData, product_id: e.target.value})}
                required
              >
                <option value="">Select Product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <Input
                type="number"
                min="1"
                value={stockData.quantity}
                onChange={(e) => setStockData({
                  ...stockData, 
                  quantity: parseInt(e.target.value) || 1
                })}
                required
              />
            </div>

            {/* Expiry Date Picker */}
            <div>
              <label className="block text-sm font-medium mb-1">Expiry Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expiryDate}
                    onSelect={(date) => date && setExpiryDate(date)}
                    initialFocus
                    disabled={(date) => date < today}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Batch Number */}
            <div>
              <label className="block text-sm font-medium mb-1">Batch Number (optional)</label>
              <Input
                placeholder="Batch identifier"
                value={stockData.batch_number}
                onChange={(e) => setStockData({...stockData, batch_number: e.target.value})}
              />
            </div>
          </div>

          <Button 
            onClick={() => addStockItem.mutate()}
            disabled={addStockItem.isPending}
          >
            {addStockItem.isPending ? "Adding..." : "Add to Stock"}
          </Button>
        </CardContent>
      </Card>

      {/* Stock Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Stock</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingStock ? (
            <div className="text-center py-4">Loading stock...</div>
          ) : stockItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Batch #</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map(item => (
                  <TableRow key={item.id} className={
                    isExpired(item.expiry_date) ? 
                      'bg-red-50' : 
                      isNearExpiry(item.expiry_date) ? 
                        'bg-yellow-50' : ''
                  }>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      {format(new Date(item.expiry_date), 'MMM d, yyyy')}
                      {isExpired(item.expiry_date) ? (
                        <Badge variant="outline" className="ml-2 bg-red-100 text-red-800 border-red-300">
                          Expired
                        </Badge>
                      ) : isNearExpiry(item.expiry_date) ? (
                        <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-300">
                          Expiring Soon
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{item.batch_number || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No stock items found. Add your first stock item above.
            </div>
          )}
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default StockPage;
