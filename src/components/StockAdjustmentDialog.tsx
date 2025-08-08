
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';

interface KitchenStock {
  id: string;
  ingredient_name: string;
  quantity_on_hand: number;
  unit: string;
  cost_per_unit: number;
}

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kitchenStock: KitchenStock[];
}

const StockAdjustmentDialog = ({ open, onOpenChange, kitchenStock }: StockAdjustmentDialogProps) => {
  const queryClient = useQueryClient();
  const [adjustment, setAdjustment] = useState({
    stock_id: '',
    adjustment_type: '',
    quantity_adjusted: 0,
    reason: '',
    adjusted_by: 'Manual Adjustment'
  });

  const selectedStock = kitchenStock.find(stock => stock.id === adjustment.stock_id);

  const adjustStockMutation = useMutation({
    mutationFn: async () => {
      if (!adjustment.stock_id || !adjustment.adjustment_type || !adjustment.quantity_adjusted) {
        throw new Error('Please fill all required fields');
      }

      const stock = kitchenStock.find(s => s.id === adjustment.stock_id);
      if (!stock) throw new Error('Stock not found');

      let newQuantity: number;
      let adjustmentAmount = Math.abs(adjustment.quantity_adjusted);

      if (adjustment.adjustment_type === 'increase') {
        newQuantity = stock.quantity_on_hand + adjustmentAmount;
      } else if (adjustment.adjustment_type === 'decrease') {
        if (adjustmentAmount > stock.quantity_on_hand) {
          throw new Error('Cannot decrease stock below zero');
        }
        newQuantity = stock.quantity_on_hand - adjustmentAmount;
      } else { // correction
        if (adjustment.quantity_adjusted < 0) {
          throw new Error('New quantity cannot be negative');
        }
        newQuantity = adjustment.quantity_adjusted;
        adjustmentAmount = Math.abs(newQuantity - stock.quantity_on_hand);
      }

      // Update kitchen stock
      const { error: updateError } = await supabase
        .from('kitchen_stock')
        .update({
          quantity_on_hand: newQuantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', adjustment.stock_id);

      if (updateError) throw updateError;

      // Record the adjustment
      const { error: adjustmentError } = await supabase
        .from('kitchen_stock_adjustments')
        .insert({
          kitchen_stock_id: adjustment.stock_id,
          ingredient_name: stock.ingredient_name,
          adjustment_type: adjustment.adjustment_type,
          quantity_adjusted: adjustmentAmount,
          previous_quantity: stock.quantity_on_hand,
          new_quantity: newQuantity,
          reason: adjustment.reason,
          adjusted_by: adjustment.adjusted_by
        });

      if (adjustmentError) throw adjustmentError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen_stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock_adjustments'] });
      setAdjustment({ stock_id: '', adjustment_type: '', quantity_adjusted: 0, reason: '', adjusted_by: 'Manual Adjustment' });
      onOpenChange(false);
      toast.success('Stock adjusted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Kitchen Stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Stock Item</label>
            <Select
              value={adjustment.stock_id}
              onValueChange={(value) => setAdjustment({...adjustment, stock_id: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose stock item" />
              </SelectTrigger>
              <SelectContent>
                {kitchenStock.map(stock => (
                  <SelectItem key={stock.id} value={stock.id}>
                    {stock.ingredient_name} ({stock.quantity_on_hand.toFixed(1)} {stock.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Adjustment Type</label>
            <Select
              value={adjustment.adjustment_type}
              onValueChange={(value) => setAdjustment({...adjustment, adjustment_type: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select adjustment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Increase Stock</SelectItem>
                <SelectItem value="decrease">Decrease Stock</SelectItem>
                <SelectItem value="correction">Set Exact Quantity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {adjustment.adjustment_type === 'correction' ? 'New Quantity' : 'Adjustment Quantity'}
            </label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={adjustment.quantity_adjusted}
              onChange={(e) => setAdjustment({
                ...adjustment, 
                quantity_adjusted: parseFloat(e.target.value) || 0
              })}
              placeholder={adjustment.adjustment_type === 'correction' ? 'Enter new total quantity' : 'Enter adjustment amount'}
            />
            {selectedStock && adjustment.adjustment_type !== 'correction' && (
              <p className="text-sm text-gray-500 mt-1">
                Current: {selectedStock.quantity_on_hand.toFixed(1)} {selectedStock.unit}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <Textarea
              value={adjustment.reason}
              onChange={(e) => setAdjustment({...adjustment, reason: e.target.value})}
              placeholder="Reason for adjustment (e.g., Stock take, Correction, Spillage)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Adjusted By</label>
            <Input
              value={adjustment.adjusted_by}
              onChange={(e) => setAdjustment({...adjustment, adjusted_by: e.target.value})}
              placeholder="Your name"
            />
          </div>

          <Button 
            onClick={() => adjustStockMutation.mutate()}
            disabled={adjustStockMutation.isPending}
            className="w-full"
          >
            {adjustStockMutation.isPending ? "Adjusting..." : "Apply Adjustment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StockAdjustmentDialog;
