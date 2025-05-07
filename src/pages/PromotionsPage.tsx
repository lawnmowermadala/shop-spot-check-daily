
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';

// Types
interface Promotion {
  id: string;
  product_id: string;
  product_name: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  description: string;
  created_at?: string;
}

interface Product {
  id: string;
  name: string;
}

const PromotionsPage = () => {
  const queryClient = useQueryClient();
  const today = new Date();
  
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)); // Default 7 days from now
  const [promotionData, setPromotionData] = useState({
    product_id: '',
    discount_percentage: 10,
    description: ''
  });

  // 1. Fetch Products
  const { data: products = [] } = useQuery({
    queryKey: ['promotion_products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    }
  });

  // 2. Fetch Promotions
  const { data: promotions = [], isLoading: isLoadingPromotions } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select(`
          id, 
          product_id,
          product_name,
          discount_percentage,
          start_date,
          end_date,
          description,
          created_at
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Promotion[];
    }
  });

  // 3. Add Promotion Mutation
  const addPromotion = useMutation({
    mutationFn: async () => {
      if (!promotionData.product_id || !promotionData.discount_percentage || !startDate || !endDate) {
        throw new Error('Please fill all required fields');
      }

      if (isAfter(startDate, endDate)) {
        throw new Error('End date must be after start date');
      }

      const selectedProduct = products.find(p => p.id === promotionData.product_id);
      if (!selectedProduct) throw new Error('Product not found');

      const { error } = await supabase
        .from('promotions')
        .insert({
          product_id: promotionData.product_id,
          product_name: selectedProduct.name,
          discount_percentage: promotionData.discount_percentage,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          description: promotionData.description || 'Limited time offer'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['promotions']);
      setPromotionData({
        product_id: '',
        discount_percentage: 10,
        description: ''
      });
      toast("Promotion added successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Delete promotion mutation
  const deletePromotion = useMutation({
    mutationFn: async (promotionId: string) => {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', promotionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['promotions']);
      toast("Promotion deleted successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  const isPromotionActive = (startDate: string, endDate: string): boolean => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
  };

  const handleDelete = (promotionId: string) => {
    if (window.confirm("Are you sure you want to delete this promotion?")) {
      deletePromotion.mutate(promotionId);
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <h1 className="text-2xl font-bold">Promotions Management</h1>
      
      {/* Add Promotion Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Promotion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Selection */}
            <div>
              <label className="block text-sm font-medium mb-1">Product</label>
              <select
                className="w-full p-2 border rounded"
                value={promotionData.product_id}
                onChange={(e) => setPromotionData({...promotionData, product_id: e.target.value})}
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

            {/* Discount Percentage */}
            <div>
              <label className="block text-sm font-medium mb-1">Discount (%)</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={promotionData.discount_percentage}
                onChange={(e) => setPromotionData({
                  ...promotionData, 
                  discount_percentage: parseInt(e.target.value) || 0
                })}
                required
              />
            </div>

            {/* Start Date Picker */}
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date Picker */}
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                    disabled={(date) => date < startDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <Input
                placeholder="Promotion description"
                value={promotionData.description}
                onChange={(e) => setPromotionData({...promotionData, description: e.target.value})}
              />
            </div>
          </div>

          <Button 
            onClick={() => addPromotion.mutate()}
            disabled={addPromotion.isLoading}
          >
            {addPromotion.isLoading ? "Creating..." : "Create Promotion"}
          </Button>
        </CardContent>
      </Card>

      {/* Promotions List */}
      <Card>
        <CardHeader>
          <CardTitle>Active and Upcoming Promotions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPromotions ? (
            <div className="text-center py-4">Loading promotions...</div>
          ) : promotions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map(promo => (
                  <TableRow key={promo.id}>
                    <TableCell>{promo.product_name}</TableCell>
                    <TableCell>{promo.discount_percentage}%</TableCell>
                    <TableCell>
                      {format(new Date(promo.start_date), 'MMM d')} - {format(new Date(promo.end_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {isPromotionActive(promo.start_date, promo.end_date) ? (
                        <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>
                      ) : new Date(promo.start_date) > today ? (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Upcoming</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-200">Expired</Badge>
                      )}
                    </TableCell>
                    <TableCell>{promo.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(promo.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No promotions found. Create your first promotion above.
            </div>
          )}
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default PromotionsPage;
