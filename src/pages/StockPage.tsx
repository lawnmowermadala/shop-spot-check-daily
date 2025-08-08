import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRightLeft, Plus, Package, Settings, History } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import StockAdjustmentDialog from '@/components/StockAdjustmentDialog';

// Types
interface Ingredient {
  id: string;
  name: string;
  unit: string;
  weight: number;
  price_ex_vat: number;
  total_price: number;
}

interface KitchenStock {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  pack_size: number;
  unit: string;
  quantity_on_hand: number;
  cost_per_unit: number;
  total_value: number;
  last_updated: string;
  created_at: string;
}

interface IngredientTransfer {
  id: string;
  from_ingredient_id?: string;
  to_ingredient_id?: string;
  from_stock_id?: string;
  to_stock_id?: string;
  quantity_transferred: number;
  unit: string;
  from_cost_per_unit: number;
  to_cost_per_unit: number;
  price_difference: number;
  transfer_date: string;
  notes?: string;
  transfer_type: string;
}

const StockPage = () => {
  const queryClient = useQueryClient();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [stockToStockDialogOpen, setStockToStockDialogOpen] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  
  // Transfer from ingredient to kitchen stock
  const [ingredientTransfer, setIngredientTransfer] = useState({
    ingredient_id: '',
    quantity_transferred: 0,
    notes: ''
  });

  // Transfer between kitchen stocks
  const [stockTransfer, setStockTransfer] = useState({
    from_stock_id: '',
    to_ingredient_id: '',
    quantity_transferred: 0,
    notes: ''
  });

  // Fetch ingredients
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Ingredient[];
    }
  });

  // Fetch kitchen stock
  const { data: kitchenStock = [], isLoading: isLoadingStock } = useQuery({
    queryKey: ['kitchen_stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kitchen_stock')
        .select('*')
        .order('ingredient_name');
      
      if (error) throw error;
      return data as KitchenStock[];
    }
  });

  // Fetch transfer history
  const { data: transfers = [] } = useQuery({
    queryKey: ['ingredient_transfers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredient_transfers')
        .select('*')
        .order('transfer_date', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as IngredientTransfer[];
    }
  });

  // Fetch stock adjustments history
  const { data: adjustments = [] } = useQuery({
    queryKey: ['stock_adjustments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kitchen_stock_adjustments')
        .select('*')
        .order('adjustment_date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  // Transfer ingredient to kitchen stock mutation
  const transferToKitchenMutation = useMutation({
    mutationFn: async () => {
      if (!ingredientTransfer.ingredient_id || !ingredientTransfer.quantity_transferred) {
        throw new Error('Please select ingredient and quantity');
      }

      const selectedIngredient = ingredients.find(i => i.id === ingredientTransfer.ingredient_id);
      if (!selectedIngredient) throw new Error('Ingredient not found');

      // Calculate cost per unit from ingredient
      const costPerUnit = selectedIngredient.total_price / selectedIngredient.weight;

      // Check if kitchen stock already exists for this ingredient
      const existingStock = kitchenStock.find(s => s.ingredient_id === ingredientTransfer.ingredient_id);

      if (existingStock) {
        // Update existing stock
        const { error: updateError } = await supabase
          .from('kitchen_stock')
          .update({
            quantity_on_hand: existingStock.quantity_on_hand + ingredientTransfer.quantity_transferred,
            cost_per_unit: costPerUnit,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingStock.id);

        if (updateError) throw updateError;
      } else {
        // Create new kitchen stock entry
        const { error: insertError } = await supabase
          .from('kitchen_stock')
          .insert({
            ingredient_id: ingredientTransfer.ingredient_id,
            ingredient_name: selectedIngredient.name,
            pack_size: selectedIngredient.weight,
            unit: selectedIngredient.unit,
            quantity_on_hand: ingredientTransfer.quantity_transferred,
            cost_per_unit: costPerUnit
          });

        if (insertError) throw insertError;
      }

      // Record the transfer
      const { error: transferError } = await supabase
        .from('ingredient_transfers')
        .insert({
          from_ingredient_id: ingredientTransfer.ingredient_id,
          quantity_transferred: ingredientTransfer.quantity_transferred,
          unit: selectedIngredient.unit,
          from_cost_per_unit: costPerUnit,
          to_cost_per_unit: costPerUnit,
          transfer_type: 'ingredient_to_stock',
          notes: ingredientTransfer.notes
        });

      if (transferError) throw transferError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen_stock'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient_transfers'] });
      setIngredientTransfer({ ingredient_id: '', quantity_transferred: 0, notes: '' });
      setTransferDialogOpen(false);
      toast.success('Ingredient transferred to kitchen stock!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Transfer between kitchen stocks mutation
  const transferBetweenStocksMutation = useMutation({
    mutationFn: async () => {
      if (!stockTransfer.from_stock_id || !stockTransfer.to_ingredient_id || !stockTransfer.quantity_transferred) {
        throw new Error('Please fill all required fields');
      }

      const fromStock = kitchenStock.find(s => s.id === stockTransfer.from_stock_id);
      const toIngredient = ingredients.find(i => i.id === stockTransfer.to_ingredient_id);
      
      if (!fromStock || !toIngredient) throw new Error('Stock or ingredient not found');
      
      if (fromStock.quantity_on_hand < stockTransfer.quantity_transferred) {
        throw new Error('Insufficient stock quantity');
      }

      // Calculate new cost per unit for target ingredient
      const newCostPerUnit = toIngredient.total_price / toIngredient.weight;

      // Update source stock (reduce quantity)
      const { error: updateFromError } = await supabase
        .from('kitchen_stock')
        .update({
          quantity_on_hand: fromStock.quantity_on_hand - stockTransfer.quantity_transferred,
          last_updated: new Date().toISOString()
        })
        .eq('id', stockTransfer.from_stock_id);

      if (updateFromError) throw updateFromError;

      // Check if target ingredient already exists in kitchen stock
      const existingTargetStock = kitchenStock.find(s => s.ingredient_id === stockTransfer.to_ingredient_id);

      if (existingTargetStock) {
        // Update existing target stock
        const { error: updateToError } = await supabase
          .from('kitchen_stock')
          .update({
            quantity_on_hand: existingTargetStock.quantity_on_hand + stockTransfer.quantity_transferred,
            cost_per_unit: newCostPerUnit,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingTargetStock.id);

        if (updateToError) throw updateToError;
      } else {
        // Create new kitchen stock entry for target
        const { error: insertError } = await supabase
          .from('kitchen_stock')
          .insert({
            ingredient_id: stockTransfer.to_ingredient_id,
            ingredient_name: toIngredient.name,
            pack_size: toIngredient.weight,
            unit: toIngredient.unit,
            quantity_on_hand: stockTransfer.quantity_transferred,
            cost_per_unit: newCostPerUnit
          });

        if (insertError) throw insertError;
      }

      // Record the transfer
      const { error: transferError } = await supabase
        .from('ingredient_transfers')
        .insert({
          from_stock_id: stockTransfer.from_stock_id,
          to_ingredient_id: stockTransfer.to_ingredient_id,
          quantity_transferred: stockTransfer.quantity_transferred,
          unit: fromStock.unit,
          from_cost_per_unit: fromStock.cost_per_unit,
          to_cost_per_unit: newCostPerUnit,
          transfer_type: 'stock_to_stock',
          notes: stockTransfer.notes
        });

      if (transferError) throw transferError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen_stock'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient_transfers'] });
      setStockTransfer({ from_stock_id: '', to_ingredient_id: '', quantity_transferred: 0, notes: '' });
      setStockToStockDialogOpen(false);
      toast.success('Stock transferred successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Calculate total stock value
  const totalStockValue = kitchenStock.reduce((sum, stock) => sum + (stock.total_value || 0), 0);
  const lowStockItems = kitchenStock.filter(stock => stock.quantity_on_hand < 5).length;

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <h1 className="text-2xl font-bold">Kitchen Stock Management</h1>
      
      {/* Stock Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">R{totalStockValue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kitchenStock.length}</p>
          </CardContent>
        </Card>
        <Card className={lowStockItems > 0 ? "border-yellow-200" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-700">{lowStockItems}</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 flex-wrap">
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Transfer Ingredient to Kitchen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Ingredient to Kitchen Stock</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Ingredient</label>
                <Select
                  value={ingredientTransfer.ingredient_id}
                  onValueChange={(value) => setIngredientTransfer({...ingredientTransfer, ingredient_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose ingredient" />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients.map(ingredient => (
                      <SelectItem key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} ({ingredient.weight}{ingredient.unit} - R{ingredient.total_price.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity to Transfer</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={ingredientTransfer.quantity_transferred}
                  onChange={(e) => setIngredientTransfer({
                    ...ingredientTransfer, 
                    quantity_transferred: parseFloat(e.target.value) || 0
                  })}
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <Textarea
                  value={ingredientTransfer.notes}
                  onChange={(e) => setIngredientTransfer({...ingredientTransfer, notes: e.target.value})}
                  placeholder="Add any notes about this transfer"
                />
              </div>
              <Button 
                onClick={() => transferToKitchenMutation.mutate()}
                disabled={transferToKitchenMutation.isPending}
                className="w-full"
              >
                {transferToKitchenMutation.isPending ? "Transferring..." : "Transfer to Kitchen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={stockToStockDialogOpen} onOpenChange={setStockToStockDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Transfer Between Stocks
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Between Kitchen Stocks</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">From Stock</label>
                <Select
                  value={stockTransfer.from_stock_id}
                  onValueChange={(value) => setStockTransfer({...stockTransfer, from_stock_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose source stock" />
                  </SelectTrigger>
                  <SelectContent>
                    {kitchenStock.map(stock => (
                      <SelectItem key={stock.id} value={stock.id}>
                        {stock.ingredient_name} ({stock.quantity_on_hand.toFixed(1)}{stock.unit} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To Ingredient</label>
                <Select
                  value={stockTransfer.to_ingredient_id}
                  onValueChange={(value) => setStockTransfer({...stockTransfer, to_ingredient_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose target ingredient" />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients.map(ingredient => (
                      <SelectItem key={ingredient.id} value={ingredient.id}>
                        {ingredient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity to Transfer</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stockTransfer.quantity_transferred}
                  onChange={(e) => setStockTransfer({
                    ...stockTransfer, 
                    quantity_transferred: parseFloat(e.target.value) || 0
                  })}
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <Textarea
                  value={stockTransfer.notes}
                  onChange={(e) => setStockTransfer({...stockTransfer, notes: e.target.value})}
                  placeholder="Reason for transfer"
                />
              </div>
              <Button 
                onClick={() => transferBetweenStocksMutation.mutate()}
                disabled={transferBetweenStocksMutation.isPending}
                className="w-full"
              >
                {transferBetweenStocksMutation.isPending ? "Transferring..." : "Transfer Stock"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => setAdjustmentDialogOpen(true)}
        >
          <Settings className="h-4 w-4" />
          Adjust Stock
        </Button>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stock">Current Stock</TabsTrigger>
          <TabsTrigger value="transfers">Transfer History</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Current Kitchen Stock</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStock ? (
                <div className="text-center py-4">Loading kitchen stock...</div>
              ) : kitchenStock.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Pack Size</TableHead>
                      <TableHead>Quantity on Hand</TableHead>
                      <TableHead>Cost per Unit</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kitchenStock.map(stock => (
                      <TableRow key={stock.id}>
                        <TableCell className="font-medium">{stock.ingredient_name}</TableCell>
                        <TableCell>{stock.pack_size} {stock.unit}</TableCell>
                        <TableCell>{stock.quantity_on_hand.toFixed(1)} {stock.unit}</TableCell>
                        <TableCell>R{stock.cost_per_unit.toFixed(2)}</TableCell>
                        <TableCell>R{(stock.total_value || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          {stock.quantity_on_hand < 5 ? (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                              In Stock
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(stock.last_updated).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No kitchen stock found. Transfer ingredients to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardHeader>
              <CardTitle>Transfer History</CardTitle>
            </CardHeader>
            <CardContent>
              {transfers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price Difference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map(transfer => (
                      <TableRow key={transfer.id}>
                        <TableCell>{new Date(transfer.transfer_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transfer.transfer_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{transfer.quantity_transferred.toFixed(1)} {transfer.unit}</TableCell>
                        <TableCell className={transfer.price_difference > 0 ? 'text-red-600' : transfer.price_difference < 0 ? 'text-green-600' : ''}>
                          {transfer.price_difference > 0 ? '+' : ''}R{transfer.price_difference.toFixed(2)}
                        </TableCell>
                        <TableCell>{transfer.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No transfer history found.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments">
          <Card>
            <CardHeader>
              <CardTitle>Stock Adjustments History</CardTitle>
            </CardHeader>
            <CardContent>
              {adjustments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Previous Qty</TableHead>
                      <TableHead>Adjusted By</TableHead>
                      <TableHead>New Qty</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Adjusted By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.map(adjustment => (
                      <TableRow key={adjustment.id}>
                        <TableCell>{new Date(adjustment.adjustment_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{adjustment.ingredient_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            adjustment.adjustment_type === 'increase' ? 'bg-green-100 text-green-800 border-green-300' :
                            adjustment.adjustment_type === 'decrease' ? 'bg-red-100 text-red-800 border-red-300' :
                            'bg-blue-100 text-blue-800 border-blue-300'
                          }>
                            {adjustment.adjustment_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{adjustment.previous_quantity.toFixed(1)}</TableCell>
                        <TableCell className={
                          adjustment.adjustment_type === 'increase' ? 'text-green-600' :
                          adjustment.adjustment_type === 'decrease' ? 'text-red-600' : ''
                        }>
                          {adjustment.adjustment_type === 'increase' ? '+' : 
                           adjustment.adjustment_type === 'decrease' ? '-' : ''}
                          {adjustment.quantity_adjusted.toFixed(1)}
                        </TableCell>
                        <TableCell className="font-medium">{adjustment.new_quantity.toFixed(1)}</TableCell>
                        <TableCell>{adjustment.reason || '-'}</TableCell>
                        <TableCell>{adjustment.adjusted_by}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No adjustments found.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog 
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
        kitchenStock={kitchenStock}
      />
      
      <Navigation />
    </div>
  );
};

export default StockPage;
