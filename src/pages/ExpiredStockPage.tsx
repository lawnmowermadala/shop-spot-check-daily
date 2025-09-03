import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, Truck, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

// Types
interface ExpiredItem {
  id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  expiration_date: string;
  reason: string;
}

const ExpiredStockPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newItem, setNewItem] = useState({
    ingredient_name: '',
    quantity: 0,
    unit: '',
    expiration_date: '',
    reason: ''
  });

  const { data: expiredItems = [], isLoading } = useQuery({
    queryKey: ['expired_stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expired_stock')
        .select('*')
        .order('expiration_date', { ascending: true });
      
      if (error) throw error;
      return data as ExpiredItem[];
    }
  });

  const addExpiredItemMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('expired_stock')
        .insert(newItem);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expired_stock'] });
      setNewItem({ ingredient_name: '', quantity: 0, unit: '', expiration_date: '', reason: '' });
      setDialogOpen(false);
      toast.success('Expired item added successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const totalExpiredItems = expiredItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <h1 className="text-2xl font-bold">Expired Stock Management</h1>
      
      {/* Action Buttons */}
      <div className="flex gap-4 flex-wrap">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Expired Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expired Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ingredient Name</label>
                <Input
                  type="text"
                  value={newItem.ingredient_name}
                  onChange={(e) => setNewItem({...newItem, ingredient_name: e.target.value})}
                  placeholder="Enter ingredient name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({
                    ...newItem, 
                    quantity: parseFloat(e.target.value) || 0
                  })}
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <Input
                  type="text"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                  placeholder="Enter unit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expiration Date</label>
                <Input
                  type="date"
                  value={newItem.expiration_date}
                  onChange={(e) => setNewItem({...newItem, expiration_date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <Textarea
                  value={newItem.reason}
                  onChange={(e) => setNewItem({...newItem, reason: e.target.value})}
                  placeholder="Enter reason for expiration"
                />
              </div>
              <Button 
                onClick={() => addExpiredItemMutation.mutate()}
                disabled={addExpiredItemMutation.isLoading}
                className="w-full"
              >
                {addExpiredItemMutation.isLoading ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => navigate('/expired-dispatch')}
        >
          <Truck className="h-4 w-4" />
          Dispatch Expired Stock
        </Button>
      </div>

      {/* Stock Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Expired Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalExpiredItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Unique Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{expiredItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nearest Expiry Date</CardTitle>
          </CardHeader>
          <CardContent>
            {expiredItems.length > 0 ? (
              <p className="text-2xl font-bold">{new Date(expiredItems[0].expiration_date).toLocaleDateString()}</p>
            ) : (
              <p className="text-2xl font-bold">N/A</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="stock">Expired Stock</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Current Expired Stock</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading expired stock...</div>
              ) : expiredItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Expiration Date</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiredItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.ingredient_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{new Date(item.expiration_date).toLocaleDateString()}</TableCell>
                        <TableCell>{item.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No expired stock found. Add items to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Navigation />
    </div>
  );
};

export default ExpiredStockPage;
