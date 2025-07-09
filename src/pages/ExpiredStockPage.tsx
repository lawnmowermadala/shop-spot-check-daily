import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, AlertTriangle, Trash2, Search, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Navigation from '@/components/Navigation';

// Types
interface ExpiredItem {
  id: string;
  product_name: string;
  quantity: string;
  batch_date: string;
  removal_date: string;
  product_id?: string;
  selling_price: number;
  total_cost_loss: number;
  created_at?: string;
  products?: {
    name: string;
    code: string;
  };
}

interface Product {
  id: string;
  name: string;
  code: string;
}

const ExpiredStockPage = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isBatchCalendarOpen, setIsBatchCalendarOpen] = useState(false);
  const [isRemovalCalendarOpen, setIsRemovalCalendarOpen] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    productName: '',
    quantity: '',
    sellingPrice: '',
    batchDate: new Date(),
    removalDate: new Date(),
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    }
  });

  // Filter products based on search term
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch expired items with product details
  const { data: expiredItems = [], isLoading } = useQuery({
    queryKey: ['expired-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expired_items')
        .select(`
          *,
          products (name, code)
        `)
        .order('removal_date', { ascending: false });
      
      if (error) throw error;
      return data as ExpiredItem[];
    }
  });

  // Handle product selection
  const handleProductSelect = (productId: string, productName: string) => {
    setFormData({
      ...formData, 
      productId, 
      productName
    });
    setSearchTerm('');
    setIsProductDropdownOpen(false);
  };

  // Add expired item mutation
  const addExpiredItem = useMutation({
    mutationFn: async () => {
      if (!formData.productId || !formData.quantity || !formData.sellingPrice) {
        throw new Error('Please fill all required fields');
      }

      const { error } = await supabase
        .from('expired_items')
        .insert({
          product_id: formData.productId,
          product_name: formData.productName,
          quantity: formData.quantity,
          selling_price: parseFloat(formData.sellingPrice),
          batch_date: format(formData.batchDate, 'yyyy-MM-dd'),
          removal_date: format(formData.removalDate, 'yyyy-MM-dd')
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expired-items'] });
      setFormData({
        productId: '',
        productName: '',
        quantity: '',
        sellingPrice: '',
        batchDate: new Date(),
        removalDate: new Date(),
      });
      toast("Expired item logged successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete expired item mutation
  const deleteExpiredItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('expired_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expired-items'] });
      toast("Item removed from expired records");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addExpiredItem.mutate();
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Expired Stock Management</h1>
        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">Kitchen Staff</span>
      </div>
      
      <p className="text-gray-600">
        Record and manage expired products to minimize waste and keep inventory accurate.
      </p>

      {/* Loss Summary */}
      {expiredItems.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Items Lost</p>
                <p className="text-2xl font-bold text-red-600">
                  {expiredItems.reduce((sum, item) => sum + parseFloat(item.quantity || '0'), 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Financial Loss</p>
                <p className="text-2xl font-bold text-red-600">
                  R{expiredItems.reduce((sum, item) => sum + (item.total_cost_loss || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Average Loss Per Item</p>
                <p className="text-2xl font-bold text-red-600">
                  R{expiredItems.length > 0 ? (expiredItems.reduce((sum, item) => sum + (item.total_cost_loss || 0), 0) / expiredItems.length).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Add Expired Item Form */}
      <Card>
        <CardHeader>
          <CardTitle>Log Expired Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium mb-1">Select Product *</label>
                <div className="relative">
                  <div className="flex items-center border rounded-md">
                    <Search className="ml-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or barcode"
                      className="border-0 pl-2 focus-visible:ring-0 focus-visible:ring-offset-0"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setIsProductDropdownOpen(true)}
                    />
                    <ChevronDown 
                      className="h-4 w-4 mr-3 text-gray-400 cursor-pointer" 
                      onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                    />
                  </div>
                  {isProductDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border max-h-60 overflow-auto">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map(product => (
                          <div
                            key={product.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleProductSelect(product.id, product.name)}
                          >
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.code}</div>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-gray-500">No products found</div>
                      )}
                    </div>
                  )}
                </div>
                {formData.productId && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-md">
                    <div className="font-medium">Selected: {formData.productName}</div>
                    <button
                      type="button"
                      className="text-sm text-red-500 mt-1"
                      onClick={() => {
                        setFormData({...formData, productId: '', productName: ''});
                        setSearchTerm('');
                      }}
                    >
                      Clear selection
                    </button>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quantity *</label>
                <Input
                  type="number"
                  placeholder="Quantity lost"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Selling Price Per Unit (ZAR) *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Batch Date</label>
                <Popover open={isBatchCalendarOpen} onOpenChange={setIsBatchCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.batchDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.batchDate}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({...formData, batchDate: date});
                          setIsBatchCalendarOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Removal Date</label>
                <Popover open={isRemovalCalendarOpen} onOpenChange={setIsRemovalCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.removalDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.removalDate}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({...formData, removalDate: date});
                          setIsRemovalCalendarOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full md:w-auto"
              disabled={addExpiredItem.isPending}
            >
              {addExpiredItem.isPending ? "Logging..." : "Log Expired Item"}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Expired Items List */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
          <CardTitle>Expired Items History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading expired items...</div>
          ) : expiredItems.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Code</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Quantity Lost</TableHead>
                    <TableHead>Selling Price (ZAR)</TableHead>
                    <TableHead>Total Loss (ZAR)</TableHead>
                    <TableHead>Batch Date</TableHead>
                    <TableHead>Removal Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">
                        {item.products?.code || 'N/A'}
                      </TableCell>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>R{item.selling_price?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="font-semibold text-red-600">
                        R{item.total_cost_loss?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>{format(parseISO(item.batch_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(parseISO(item.removal_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => deleteExpiredItem.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-10 w-10 text-orange-500 mb-2" />
              <p className="text-gray-500">No expired items recorded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default ExpiredStockPage;
