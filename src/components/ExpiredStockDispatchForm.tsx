
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExpiredItem {
  id: string;
  product_name: string;
  quantity: string;
  batch_date: string;
  removal_date: string;
  remaining_quantity: number;
  dispatch_status: string;
  cost_per_unit?: number;
  selling_price?: number;
  total_cost_loss?: number;
  product_id?: string;
  created_at?: string;
}

interface DispatchRecord {
  expired_item_id: string;
  dispatch_destination: string;
  quantity_dispatched: number;
  dispatched_by: string;
  notes?: string;
  dispatch_date: string;
}

const ExpiredStockDispatchForm = () => {
  const [expiredItems, setExpiredItems] = useState<ExpiredItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [quantityToDispatch, setQuantityToDispatch] = useState<string>("");
  const [dispatchedBy, setDispatchedBy] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const destinations = [
    "Pig Food Production",
    "Dog Food Production", 
    "Ginger Biscuit Production"
  ];

  useEffect(() => {
    fetchExpiredItems();
  }, []);

  const fetchExpiredItems = async () => {
    try {
      const { data, error } = await supabase
        .from('expired_items')
        .select('*')
        .eq('dispatch_status', 'available')
        .gt('remaining_quantity', 0);

      if (error) throw error;
      
      // Type assertion to match our interface
      const typedData = (data || []).map(item => ({
        ...item,
        remaining_quantity: item.remaining_quantity || 0,
        dispatch_status: item.dispatch_status || 'available'
      })) as ExpiredItem[];
      
      setExpiredItems(typedData);
    } catch (error) {
      console.error('Error fetching expired items:', error);
      toast({
        title: "Error",
        description: "Failed to load expired items",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItemId || !destination || !quantityToDispatch || !dispatchedBy) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const selectedItem = expiredItems.find(item => item.id === selectedItemId);
    if (!selectedItem) return;

    const dispatchQuantity = parseFloat(quantityToDispatch);
    if (dispatchQuantity > selectedItem.remaining_quantity) {
      toast({
        title: "Error",
        description: "Dispatch quantity cannot exceed remaining quantity",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert dispatch record using type assertion
      const dispatchData: DispatchRecord = {
        expired_item_id: selectedItemId,
        dispatch_destination: destination,
        quantity_dispatched: dispatchQuantity,
        dispatched_by: dispatchedBy,
        notes: notes || undefined,
        dispatch_date: new Date().toISOString().split('T')[0]
      };

      const { error: dispatchError } = await (supabase as any)
        .from('expired_stock_dispatches')
        .insert(dispatchData);

      if (dispatchError) throw dispatchError;

      // Update remaining quantity
      const newRemainingQuantity = selectedItem.remaining_quantity - dispatchQuantity;
      const newDispatchStatus = newRemainingQuantity <= 0 ? 'fully_dispatched' : 'available';

      const { error: updateError } = await supabase
        .from('expired_items')
        .update({ 
          remaining_quantity: newRemainingQuantity,
          dispatch_status: newDispatchStatus
        } as any)
        .eq('id', selectedItemId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Expired stock dispatched successfully",
      });

      // Reset form
      setSelectedItemId("");
      setDestination("");
      setQuantityToDispatch("");
      setDispatchedBy("");
      setNotes("");
      
      // Refresh items
      fetchExpiredItems();

    } catch (error) {
      console.error('Error dispatching stock:', error);
      toast({
        title: "Error",
        description: "Failed to dispatch expired stock",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedItem = expiredItems.find(item => item.id === selectedItemId);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Expired Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="item">Select Expired Item</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an expired item to dispatch" />
                </SelectTrigger>
                <SelectContent>
                  {expiredItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.product_name} - Available: {item.remaining_quantity} (Batch: {item.batch_date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedItem && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p><strong>Product:</strong> {selectedItem.product_name}</p>
                <p><strong>Available Quantity:</strong> {selectedItem.remaining_quantity}</p>
                <p><strong>Batch Date:</strong> {selectedItem.batch_date}</p>
                <p><strong>Removal Date:</strong> {selectedItem.removal_date}</p>
              </div>
            )}

            <div>
              <Label htmlFor="destination">Dispatch Destination</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {destinations.map((dest) => (
                    <SelectItem key={dest} value={dest}>
                      {dest}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity to Dispatch</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={quantityToDispatch}
                onChange={(e) => setQuantityToDispatch(e.target.value)}
                max={selectedItem?.remaining_quantity || 0}
                placeholder="Enter quantity to dispatch"
              />
            </div>

            <div>
              <Label htmlFor="dispatched-by">Dispatched By</Label>
              <Input
                id="dispatched-by"
                value={dispatchedBy}
                onChange={(e) => setDispatchedBy(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about this dispatch"
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !selectedItemId || !destination || !quantityToDispatch || !dispatchedBy}
            >
              {isSubmitting ? "Dispatching..." : "Dispatch Stock"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpiredStockDispatchForm;
