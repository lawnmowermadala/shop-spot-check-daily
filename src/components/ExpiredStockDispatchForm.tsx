
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState<string>("");
  const [dispatchedBy, setDispatchedBy] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const destinations = [
    { label: "Pig Feed", value: "pig_feed" },
    { label: "Dog Food Production", value: "dog_feed" },
    { label: "Ginger Biscuit Production", value: "ginger_biscuit" },
    { label: "Banana Bread", value: "banana_bread" },
    { label: "Kitchen Used (Cooking/Baking)", value: "kitchen_used" }
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

  const toggleItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedItems = useMemo(
    () => expiredItems.filter(item => selectedItemIds.has(item.id)),
    [expiredItems, selectedItemIds]
  );

  const totalSelectedQuantity = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.remaining_quantity, 0),
    [selectedItems]
  );

  const totalSelectedValue = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.remaining_quantity * (item.selling_price || 0), 0),
    [selectedItems]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItemIds.size === 0 || !destination || !dispatchedBy) {
      toast({
        title: "Error",
        description: "Please select items, destination, and enter your name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const dispatchDate = new Date().toISOString().split('T')[0];

      // Insert a dispatch record for each selected item (dispatch full remaining qty)
      for (const item of selectedItems) {
        const dispatchData: DispatchRecord = {
          expired_item_id: item.id,
          dispatch_destination: destination,
          quantity_dispatched: item.remaining_quantity,
          dispatched_by: dispatchedBy,
          notes: notes || undefined,
          dispatch_date: dispatchDate
        };

        const { error: dispatchError } = await (supabase as any)
          .from('expired_stock_dispatches')
          .insert(dispatchData);

        if (dispatchError) throw dispatchError;

        const { error: updateError } = await supabase
          .from('expired_items')
          .update({
            remaining_quantity: 0,
            dispatch_status: 'fully_dispatched'
          } as any)
          .eq('id', item.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Success",
        description: `${selectedItems.length} item(s) dispatched successfully`,
      });

      // Reset form
      setSelectedItemIds(new Set());
      setDestination("");
      setDispatchedBy("");
      setNotes("");

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

  // Group items by product name for easier selection
  const groupedItems = useMemo(() => {
    const groups: Record<string, ExpiredItem[]> = {};
    expiredItems.forEach(item => {
      if (!groups[item.product_name]) {
        groups[item.product_name] = [];
      }
      groups[item.product_name].push(item);
    });
    return groups;
  }, [expiredItems]);

  const selectAllOfProduct = (productName: string) => {
    const items = groupedItems[productName] || [];
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      const allSelected = items.every(item => next.has(item.id));
      if (allSelected) {
        items.forEach(item => next.delete(item.id));
      } else {
        items.forEach(item => next.add(item.id));
      }
      return next;
    });
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Expired Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Items selection with checkboxes */}
            <div>
              <Label className="text-base font-semibold">Select Expired Items to Dispatch</Label>
              <div className="mt-2 border rounded-lg max-h-80 overflow-y-auto">
                {Object.entries(groupedItems).length === 0 && (
                  <p className="p-4 text-muted-foreground text-sm">No expired items available for dispatch.</p>
                )}
                {Object.entries(groupedItems).map(([productName, items]) => {
                  const allSelected = items.every(item => selectedItemIds.has(item.id));
                  const someSelected = items.some(item => selectedItemIds.has(item.id));
                  return (
                    <div key={productName} className="border-b last:border-b-0">
                      {/* Product group header */}
                      <div
                        className="flex items-center gap-3 p-3 bg-muted/50 cursor-pointer hover:bg-muted"
                        onClick={() => selectAllOfProduct(productName)}
                      >
                        <Checkbox
                          checked={allSelected}
                          className={someSelected && !allSelected ? "opacity-50" : ""}
                          onCheckedChange={() => selectAllOfProduct(productName)}
                        />
                        <span className="font-medium">{productName}</span>
                        <span className="text-xs text-muted-foreground">
                          ({items.length} batch{items.length > 1 ? 'es' : ''})
                        </span>
                      </div>
                      {/* Individual batches */}
                      {items.map(item => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 px-6 py-2 cursor-pointer hover:bg-accent/50 ${
                            selectedItemIds.has(item.id) ? 'bg-accent/30' : ''
                          }`}
                          onClick={() => toggleItem(item.id)}
                        >
                          <Checkbox
                            checked={selectedItemIds.has(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                          <div className="flex-1 text-sm">
                            <span>Qty: <strong>{item.remaining_quantity}</strong></span>
                            <span className="mx-2">|</span>
                            <span>Batch: {item.batch_date}</span>
                            <span className="mx-2">|</span>
                            <span>Removed: {item.removal_date}</span>
                            {item.selling_price ? (
                              <>
                                <span className="mx-2">|</span>
                                <span>Value: R{(item.remaining_quantity * item.selling_price).toFixed(2)}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary of selected items */}
            {selectedItems.length > 0 && (
              <div className="p-3 bg-accent/50 border border-accent rounded-lg">
                <p className="font-semibold text-foreground">Selected: {selectedItems.length} item(s)</p>
                <p className="text-foreground">Total Quantity: <strong>{totalSelectedQuantity.toFixed(2)}</strong></p>
                <p className="text-foreground">Total Value: <strong>R{totalSelectedValue.toFixed(2)}</strong></p>
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
                    <SelectItem key={dest.value} value={dest.value}>
                      {dest.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              disabled={isSubmitting || selectedItemIds.size === 0 || !destination || !dispatchedBy}
            >
              {isSubmitting ? "Dispatching..." : `Dispatch ${selectedItems.length} Item(s)`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpiredStockDispatchForm;
