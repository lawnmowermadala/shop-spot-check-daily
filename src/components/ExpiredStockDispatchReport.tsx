
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DispatchRecord {
  id: string;
  expired_item_id: string;
  dispatch_destination: string;
  quantity_dispatched: number;
  dispatch_date: string;
  dispatched_by: string;
  notes: string | null;
  expired_items: {
    product_name: string;
  };
}

const ExpiredStockDispatchReport = () => {
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const destinationLabels = {
    ginger_biscuit: 'Ginger Biscuit Production',
    pig_feed: 'Pig Feed',
    dog_feed: 'Dog Feed'
  };

  const destinationColors = {
    ginger_biscuit: 'bg-blue-100 text-blue-800',
    pig_feed: 'bg-green-100 text-green-800',
    dog_feed: 'bg-purple-100 text-purple-800'
  };

  useEffect(() => {
    fetchDispatches();
  }, []);

  const fetchDispatches = async () => {
    try {
      const { data, error } = await supabase
        .from('expired_stock_dispatches')
        .select(`
          *,
          expired_items (
            product_name
          )
        `)
        .order('dispatch_date', { ascending: false });

      if (error) throw error;

      setDispatches(data || []);
    } catch (error) {
      console.error('Error fetching dispatches:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dispatch records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expired Stock Dispatch Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading dispatch records...</p>
        </CardContent>
      </Card>
    );
  }

  const totalsByDestination = dispatches.reduce((acc, dispatch) => {
    const dest = dispatch.dispatch_destination;
    if (!acc[dest]) {
      acc[dest] = { count: 0, quantity: 0 };
    }
    acc[dest].count++;
    acc[dest].quantity += dispatch.quantity_dispatched;
    return acc;
  }, {} as Record<string, { count: number; quantity: number }>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(totalsByDestination).map(([destination, totals]) => (
              <div key={destination} className="p-4 border rounded-lg">
                <h3 className="font-medium text-sm">{destinationLabels[destination as keyof typeof destinationLabels]}</h3>
                <div className="mt-2">
                  <p className="text-2xl font-bold">{totals.quantity}</p>
                  <p className="text-xs text-gray-500">{totals.count} dispatches</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dispatch History</CardTitle>
        </CardHeader>
        <CardContent>
          {dispatches.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No dispatch records found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Dispatched By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatches.map((dispatch) => (
                  <TableRow key={dispatch.id}>
                    <TableCell>
                      {format(new Date(dispatch.dispatch_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{dispatch.expired_items?.product_name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={destinationColors[dispatch.dispatch_destination as keyof typeof destinationColors]}
                      >
                        {destinationLabels[dispatch.dispatch_destination as keyof typeof destinationLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>{dispatch.quantity_dispatched}</TableCell>
                    <TableCell>{dispatch.dispatched_by}</TableCell>
                    <TableCell>{dispatch.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpiredStockDispatchReport;
