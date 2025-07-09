
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, AlertTriangle, Trash2 } from 'lucide-react';
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
  created_at?: string;
}

const ExpiredStockPage = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    productName: '',
    quantity: '',
    batchDate: new Date(),
    removalDate: new Date(),
  });

  // Fetch expired items
  const { data: expiredItems = [], isLoading } = useQuery({
    queryKey: ['expired-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expired_items')
        .select('*')
        .order('removal_date', { ascending: false });
      
      if (error) throw error;
      return data as ExpiredItem[];
    }
  });

  // Add expired item mutation
  const addExpiredItem = useMutation({
    mutationFn: async () => {
      if (!formData.productName || !formData.quantity) {
        throw new Error('Please fill all required fields');
      }

      const { error } = await supabase
        .from('expired_items')
        .insert({
          product_name: formData.productName,
          quantity: formData.quantity,
          batch_date: format(formData.batchDate, 'yyyy-MM-dd'),
          removal_date: format(formData.removalDate, 'yyyy-MM-dd')
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expired-items'] });
      setFormData({
        productName: '',
        quantity: '',
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
      
      {/* Add Expired Item Form */}
      <Card>
        <CardHeader>
          <CardTitle>Log Expired Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name</label>
                <Input
                  placeholder="Product name"
                  value={formData.productName}
                  onChange={(e) => setFormData({...formData, productName: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <Input
                  placeholder="Quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Batch Date</label>
                <Popover>
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
                      onSelect={(date) => date && setFormData({...formData, batchDate: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Removal Date</label>
                <Popover>
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
                      onSelect={(date) => date && setFormData({...formData, removalDate: date})}
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
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Batch Date</TableHead>
                    <TableHead>Removal Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
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
