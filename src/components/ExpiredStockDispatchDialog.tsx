
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Truck } from 'lucide-react';

interface ExpiredStockDispatchDialogProps {
  expiredItem: {
    id: string;
    product_name: string;
    quantity: string;
    remaining_quantity: number | null;
    dispatch_status: string;
  };
  onDispatchSuccess: () => void;
}

const ExpiredStockDispatchDialog = ({ expiredItem, onDispatchSuccess }: ExpiredStockDispatchDialogProps) => {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState('');
  const [quantityToDispatch, setQuantityToDispatch] = useState('');
  const [dispatchedBy, setDispatchedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const availableQuantity = expiredItem.remaining_quantity || parseFloat(expiredItem.quantity) || 0;

  const destinationLabels = {
    ginger_biscuit: 'Ginger Biscuit Production',
    pig_feed: 'Pig Feed',
    dog_feed: 'Dog Feed'
  };

  const handleDispatch = async () => {
    if (!destination || !quantityToDispatch || !dispatchedBy) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseFloat(quantityToDispatch);
    if (quantity <= 0 || quantity > availableQuantity) {
      toast({
        title: "Error",
        description: `Invalid quantity. Available: ${availableQuantity}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Insert dispatch record
      const { error: dispatchError } = await supabase
        .from('expired_stock_dispatches')
        .insert({
          expired_item_id: expiredItem.id,
          dispatch_destination: destination,
          quantity_dispatched: quantity,
          dispatched_by: dispatchedBy,
          notes: notes || null,
        });

      if (dispatchError) throw dispatchError;

      // Update expired item remaining quantity and status
      const newRemainingQuantity = availableQuantity - quantity;
      const newStatus = newRemainingQuantity === 0 ? 'fully_dispatched' : 'partially_dispatched';

      const { error: updateError } = await supabase
        .from('expired_items')
        .update({
          remaining_quantity: newRemainingQuantity,
          dispatch_status: newStatus
        })
        .eq('id', expiredItem.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `Dispatched ${quantity} units to ${destinationLabels[destination as keyof typeof destinationLabels]}`,
      });

      setOpen(false);
      setDestination('');
      setQuantityToDispatch('');
      setDispatchedBy('');
      setNotes('');
      onDispatchSuccess();
    } catch (error) {
      console.error('Error dispatching stock:', error);
      toast({
        title: "Error",
        description: "Failed to dispatch stock",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={availableQuantity <= 0}
          className="text-xs"
        >
          <Truck className="h-3 w-3 mr-1" />
          Dispatch
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dispatch Expired Stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Product</Label>
            <p className="text-sm text-gray-600">{expiredItem.product_name}</p>
            <p className="text-xs text-gray-500">Available: {availableQuantity} units</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Dispatch To *</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ginger_biscuit">Ginger Biscuit Production</SelectItem>
                <SelectItem value="pig_feed">Pig Feed</SelectItem>
                <SelectItem value="dog_feed">Dog Feed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Dispatch *</Label>
            <Input
              id="quantity"
              type="number"
              value={quantityToDispatch}
              onChange={(e) => setQuantityToDispatch(e.target.value)}
              max={availableQuantity}
              placeholder="Enter quantity"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dispatched_by">Dispatched By *</Label>
            <Input
              id="dispatched_by"
              value={dispatchedBy}
              onChange={(e) => setDispatchedBy(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this dispatch"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDispatch} disabled={loading}>
              {loading ? 'Dispatching...' : 'Dispatch'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpiredStockDispatchDialog;
