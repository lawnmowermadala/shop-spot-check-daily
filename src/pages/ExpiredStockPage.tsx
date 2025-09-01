
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ExpiredStockDispatchDialog from '@/components/ExpiredStockDispatchDialog';
import ExpiredStockDispatchReport from '@/components/ExpiredStockDispatchReport';

interface ExpiredItem {
  id: string;
  product_name: string;
  quantity: string;
  batch_date: string;
  removal_date: string;
  cost_per_unit: number | null;
  selling_price: number | null;
  total_cost_loss: number | null;
  remaining_quantity: number | null;
  dispatch_status: string;
}

const ExpiredStockPage = () => {
  const [expiredItems, setExpiredItems] = useState<ExpiredItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchExpiredItems();
  }, []);

  const fetchExpiredItems = async () => {
    try {
      const { data, error } = await supabase
        .from('expired_items')
        .select('*')
        .order('removal_date', { ascending: false });

      if (error) throw error;

      setExpiredItems(data || []);
    } catch (error) {
      console.error('Error fetching expired items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expired items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, remaining: number | null, original: string) => {
    const originalQty = parseFloat(original) || 0;
    const remainingQty = remaining || originalQty;

    if (status === 'fully_dispatched' || remainingQty === 0) {
      return <Badge variant="outline" className="bg-green-100 text-green-800">Fully Dispatched</Badge>;
    }
    if (status === 'partially_dispatched' && remainingQty < originalQty) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Partially Dispatched</Badge>;
    }
    return <Badge variant="outline" className="bg-red-100 text-red-800">Available</Badge>;
  };

  const calculateTotalLoss = () => {
    return expiredItems.reduce((total, item) => {
      return total + (item.total_cost_loss || 0);
    }, 0).toFixed(2);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Expired Stock Management</h1>
        <p>Loading expired stock data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Expired Stock Management</h1>

      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stock">Expired Stock</TabsTrigger>
          <TabsTrigger value="dispatches">Dispatch Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Expired Stock Items
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Loss</p>
                  <p className="text-2xl font-bold text-red-600">£{calculateTotalLoss()}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiredItems.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No expired items found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Original Qty</TableHead>
                      <TableHead>Available Qty</TableHead>
                      <TableHead>Batch Date</TableHead>
                      <TableHead>Removal Date</TableHead>
                      <TableHead>Cost/Unit</TableHead>
                      <TableHead>Total Loss</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiredItems.map((item) => {
                      const originalQty = parseFloat(item.quantity) || 0;
                      const availableQty = item.remaining_quantity ?? originalQty;
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{originalQty}</TableCell>
                          <TableCell className="font-medium">{availableQty}</TableCell>
                          <TableCell>{format(new Date(item.batch_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{format(new Date(item.removal_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>£{item.cost_per_unit?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell className="text-red-600 font-medium">
                            £{item.total_cost_loss?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(item.dispatch_status, item.remaining_quantity, item.quantity)}
                          </TableCell>
                          <TableCell>
                            <ExpiredStockDispatchDialog 
                              expiredItem={item}
                              onDispatchSuccess={fetchExpiredItems}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatches">
          <ExpiredStockDispatchReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExpiredStockPage;
