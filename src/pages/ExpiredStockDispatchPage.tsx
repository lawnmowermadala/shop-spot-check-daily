import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Printer, CalendarIcon, Filter, CheckSquare, Square } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ExpiredItem {
  id: string;
  product_name: string;
  quantity: string;
  batch_date: string;
  removal_date: string;
  created_at?: string;
  cost_per_unit?: number;
  selling_price?: number;
}

interface DispatchRecord {
  id: string;
  expired_item_id: string;
  dispatch_destination: string;
  quantity_dispatched: number;
  dispatched_by: string;
  notes?: string;
  dispatch_date: string;
}

const DESTINATIONS = [
  { label: "Pig Feed", value: "pig_feed" },
  { label: "Dog Food Production", value: "dog_feed" },
  { label: "Ginger Biscuit Production", value: "ginger_biscuit" },
  { label: "Banana Bread", value: "banana_bread" },
  { label: "Kitchen Used (Cooking/Baking)", value: "kitchen_used" }
];

// Simple custom checkbox to avoid Radix controlled/uncontrolled issues
const SimpleCheckbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={cn(
      "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
      checked
        ? "bg-primary border-primary text-primary-foreground"
        : "border-gray-400 bg-white hover:border-primary"
    )}
  >
    {checked && (
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </button>
);

const ExpiredStockDispatchPage = () => {
  const [expiredItems, setExpiredItems] = useState<ExpiredItem[]>([]);
  const [dispatchRecords, setDispatchRecords] = useState<DispatchRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DispatchRecord[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState<string>("");
  const [dispatchedBy, setDispatchedBy] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const [editingRecord, setEditingRecord] = useState<DispatchRecord | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchExpiredItems();
    fetchDispatchRecords();
  }, []);

  useEffect(() => {
    let filtered = [...dispatchRecords];

    if (filterPeriod !== "all") {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      if (filterPeriod === "today") {
        startDate = startOfDay(now);
        endDate = endOfDay(now);
      } else if (filterPeriod === "week") {
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
      } else if (filterPeriod === "month") {
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
      } else if (filterPeriod === "custom" && fromDate && toDate) {
        startDate = startOfDay(fromDate);
        endDate = endOfDay(toDate);
      } else {
        setFilteredRecords(filtered);
        return;
      }

      filtered = filtered.filter(record => {
        const recordDate = new Date(record.dispatch_date);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }

    setFilteredRecords(filtered);
  }, [dispatchRecords, filterPeriod, fromDate, toDate]);

  const fetchExpiredItems = async () => {
    try {
      const { data, error } = await supabase
        .from('expired_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setExpiredItems(data || []);
    } catch (error) {
      console.error('Error fetching expired items:', error);
      toast({ title: "Error", description: "Failed to load expired items", variant: "destructive" });
    }
  };

  const fetchDispatchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('expired_stock_dispatches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDispatchRecords(data || []);
    } catch (error) {
      console.error('Error fetching dispatch records:', error);
    }
  };

  const remainingQuantityMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of expiredItems) {
      const totalDispatched = dispatchRecords
        .filter(r => r.expired_item_id === item.id)
        .reduce((sum, r) => sum + r.quantity_dispatched, 0);
      map[item.id] = parseFloat(item.quantity) - totalDispatched;
    }
    return map;
  }, [expiredItems, dispatchRecords]);

  const availableItems = useMemo(
    () => expiredItems.filter(item => (remainingQuantityMap[item.id] ?? 0) > 0),
    [expiredItems, remainingQuantityMap]
  );

  const groupedItems = useMemo(() => {
    const groups: Record<string, ExpiredItem[]> = {};
    availableItems.forEach(item => {
      if (!groups[item.product_name]) groups[item.product_name] = [];
      groups[item.product_name].push(item);
    });
    return groups;
  }, [availableItems]);

  const toggleItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOfProduct = (productName: string) => {
    const items = groupedItems[productName] || [];
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      const allSelected = items.every(item => next.has(item.id));
      if (allSelected) items.forEach(item => next.delete(item.id));
      else items.forEach(item => next.add(item.id));
      return next;
    });
  };

  const selectedItems = useMemo(
    () => availableItems.filter(item => selectedItemIds.has(item.id)),
    [availableItems, selectedItemIds]
  );

  const totalSelectedQuantity = useMemo(
    () => selectedItems.reduce((sum, item) => sum + (remainingQuantityMap[item.id] ?? 0), 0),
    [selectedItems, remainingQuantityMap]
  );

  const totalSelectedValue = useMemo(
    () => selectedItems.reduce((sum, item) => {
      const remaining = remainingQuantityMap[item.id] ?? 0;
      return sum + remaining * (item.selling_price || item.cost_per_unit || 0);
    }, 0),
    [selectedItems, remainingQuantityMap]
  );

  const getPeriodLabel = () => {
    switch (filterPeriod) {
      case "today": return "Today's Dispatches";
      case "week": return "This Week's Dispatches";
      case "month": return "This Month's Dispatches";
      case "custom": return `Dispatches (${fromDate ? format(fromDate, "MMM dd") : ""} - ${toDate ? format(toDate, "MMM dd, yyyy") : ""})`;
      default: return "All Dispatches";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemIds.size === 0 || !destination || !dispatchedBy) {
      toast({ title: "Error", description: "Please select items, destination, and enter your name", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      for (const item of selectedItems) {
        const remaining = remainingQuantityMap[item.id] ?? 0;
        const { error } = await supabase
          .from('expired_stock_dispatches')
          .insert({
            expired_item_id: item.id,
            dispatch_destination: destination,
            quantity_dispatched: remaining,
            dispatched_by: dispatchedBy,
            notes: notes || null
          });
        if (error) throw error;
      }
      toast({ title: "Success", description: `${selectedItems.length} item(s) dispatched successfully` });
      setSelectedItemIds(new Set());
      setDestination("");
      setDispatchedBy("");
      setNotes("");
      fetchDispatchRecords();
      fetchExpiredItems();
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to dispatch: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDispatch = async (updatedRecord: DispatchRecord) => {
    try {
      const { error } = await supabase
        .from('expired_stock_dispatches')
        .update({
          dispatch_destination: updatedRecord.dispatch_destination,
          quantity_dispatched: updatedRecord.quantity_dispatched,
          dispatched_by: updatedRecord.dispatched_by,
          notes: updatedRecord.notes
        })
        .eq('id', updatedRecord.id);
      if (error) throw error;
      toast({ title: "Success", description: "Dispatch record updated successfully" });
      setShowEditDialog(false);
      setEditingRecord(null);
      fetchDispatchRecords();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update dispatch record", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    const destinationSummaries = DESTINATIONS.map(dest => {
      const destRecords = filteredRecords.filter(r => r.dispatch_destination === dest.value);
      const totalDispatched = destRecords.reduce((sum, r) => sum + r.quantity_dispatched, 0);
      const totalValue = destRecords.reduce((sum, r) => {
        const item = expiredItems.find(i => i.id === r.expired_item_id);
        return sum + (item?.cost_per_unit || item?.selling_price || 0) * r.quantity_dispatched;
      }, 0);
      return { label: dest.label, totalDispatched, totalValue };
    });

    const printContent = `
      <html><head><title>Expired Stock Dispatch Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1, h2 { color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .summary-item { border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #f2f2f2; }
      </style></head><body>
      <div class="header"><h1>Expired Stock Dispatch Report</h1><h3>${format(new Date(), 'PPPP')}</h3><h2>${getPeriodLabel()}</h2></div>
      <h2>Summary by Destination</h2>
      <div class="summary">${destinationSummaries.map(d => `
        <div class="summary-item">
          <div style="font-weight:bold">${d.label}</div>
          <div style="font-size:1.5rem;color:#2563eb">${d.totalDispatched.toFixed(2)}</div>
          <div style="color:#666;font-size:0.9rem">Total Dispatched</div>
          <div style="font-size:1.2rem;color:#16a34a">R${d.totalValue.toFixed(2)}</div>
          <div style="color:#666;font-size:0.9rem">Total Value</div>
        </div>`).join('')}</div>
      <h2>Detailed Records</h2>
      <table><thead><tr><th>Date</th><th>Product</th><th>Qty</th><th>Value</th><th>Destination</th><th>By</th><th>Notes</th></tr></thead>
      <tbody>${filteredRecords.map(r => {
        const item = expiredItems.find(i => i.id === r.expired_item_id);
        const val = (item?.cost_per_unit || item?.selling_price || 0) * r.quantity_dispatched;
        return `<tr><td>${r.dispatch_date}</td><td>${item?.product_name || 'Unknown'}</td><td>${r.quantity_dispatched}</td><td>R${val.toFixed(2)}</td><td>${DESTINATIONS.find(d => d.value === r.dispatch_destination)?.label || r.dispatch_destination}</td><td>${r.dispatched_by}</td><td>${r.notes || '-'}</td></tr>`;
      }).join('')}</tbody></table>
      </body></html>`;

    const w = window.open('', '_blank');
    w?.document.write(printContent);
    w?.document.close();
    setTimeout(() => w?.print(), 500);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Expired Stock Dispatch</h1>
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" /> Print Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Filter Records</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />{showFilters ? "Hide" : "Show"} Filters
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Time Period</Label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filterPeriod === "custom" && (
                <>
                  <div>
                    <Label>From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fromDate ? format(fromDate, "PPP") : "Pick start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {toDate ? format(toDate, "PPP") : "Pick end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dispatch Form */}
        <Card>
          <CardHeader><CardTitle>Dispatch Expired Stock</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Select Items to Dispatch</Label>
                <div className="mt-2 border rounded-lg max-h-80 overflow-y-auto">
                  {Object.entries(groupedItems).length === 0 ? (
                    <p className="p-4 text-muted-foreground text-sm">No expired items available for dispatch.</p>
                  ) : (
                    Object.entries(groupedItems).map(([productName, items]) => {
                      const allSelected = items.every(item => selectedItemIds.has(item.id));
                      const someSelected = items.some(item => selectedItemIds.has(item.id));
                      return (
                        <div key={productName} className="border-b last:border-b-0">
                          {/* Product group header */}
                          <div
                            className="flex items-center gap-3 p-3 bg-muted/50 cursor-pointer hover:bg-muted select-none"
                            onClick={() => toggleAllOfProduct(productName)}
                          >
                            <SimpleCheckbox
                              checked={allSelected}
                              onChange={() => toggleAllOfProduct(productName)}
                            />
                            <span className={cn("font-medium", someSelected && !allSelected && "opacity-70")}>
                              {productName}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {items.length} batch{items.length > 1 ? 'es' : ''}
                            </span>
                          </div>
                          {/* Individual batches */}
                          {items.map(item => {
                            const remaining = remainingQuantityMap[item.id] ?? 0;
                            const isSelected = selectedItemIds.has(item.id);
                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "flex items-center gap-3 px-6 py-2 cursor-pointer hover:bg-accent/50 select-none",
                                  isSelected && "bg-accent/30"
                                )}
                                onClick={() => toggleItem(item.id)}
                              >
                                <SimpleCheckbox
                                  checked={isSelected}
                                  onChange={() => toggleItem(item.id)}
                                />
                                <div className="flex-1 text-sm">
                                  <span>Qty: <strong>{remaining.toFixed(2)}</strong></span>
                                  <span className="mx-2 text-muted-foreground">|</span>
                                  <span>Batch: {item.batch_date}</span>
                                  <span className="mx-2 text-muted-foreground">|</span>
                                  <span>Removed: {item.removal_date}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedItems.length > 0 && (
                <div className="p-3 bg-accent/50 border border-accent rounded-lg">
                  <p className="font-semibold">Selected: {selectedItems.length} item(s)</p>
                  <p>Total Quantity: <strong>{totalSelectedQuantity.toFixed(2)}</strong></p>
                  <p>Total Value: <strong>R{totalSelectedValue.toFixed(2)}</strong></p>
                </div>
              )}

              <div>
                <Label>Dispatch Destination</Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    {DESTINATIONS.map(dest => (
                      <SelectItem key={dest.value} value={dest.value}>{dest.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Dispatched By</Label>
                <Input value={dispatchedBy} onChange={e => setDispatchedBy(e.target.value)} placeholder="Enter your name" />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" rows={3} />
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

        {/* Dispatch History */}
        <Card>
          <CardHeader>
            <CardTitle>{getPeriodLabel()}</CardTitle>
            <p className="text-sm text-gray-500">Showing {filteredRecords.length} of {dispatchRecords.length} total</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredRecords.length === 0 ? (
                <p className="text-gray-500 text-sm">No dispatches found for the selected period.</p>
              ) : (
                filteredRecords.map(record => {
                  const item = expiredItems.find(i => i.id === record.expired_item_id);
                  const unitValue = item?.cost_per_unit || item?.selling_price || 0;
                  const totalValue = unitValue * record.quantity_dispatched;
                  return (
                    <div key={record.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item?.product_name || 'Unknown Item'}</p>
                          <p className="text-sm text-gray-500">To: {DESTINATIONS.find(d => d.value === record.dispatch_destination)?.label || record.dispatch_destination}</p>
                          <p className="text-sm text-gray-500">Qty: {record.quantity_dispatched} | Value: R{totalValue.toFixed(2)}</p>
                          <p className="text-sm text-gray-500">By: {record.dispatched_by}</p>
                          {record.notes && <p className="text-sm text-gray-500 mt-1">Notes: {record.notes}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400">{record.dispatch_date}</span>
                          <Button variant="outline" size="sm" onClick={() => { setEditingRecord(record); setShowEditDialog(true); }}>
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {DESTINATIONS.map(dest => {
          const destRecords = filteredRecords.filter(r => r.dispatch_destination === dest.value);
          const totalDispatched = destRecords.reduce((sum, r) => sum + r.quantity_dispatched, 0);
          const totalValue = destRecords.reduce((sum, r) => {
            const item = expiredItems.find(i => i.id === r.expired_item_id);
            return sum + (item?.cost_per_unit || item?.selling_price || 0) * r.quantity_dispatched;
          }, 0);
          return (
            <Card key={dest.value}>
              <CardContent className="pt-6 pb-4">
                <div className="text-center">
                  <h3 className="font-medium text-sm mb-2">{dest.label}</h3>
                  <p className="text-2xl font-bold text-blue-600">{totalDispatched.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Total Dispatched</p>
                  <p className="text-lg font-semibold text-green-600 mt-1">R{totalValue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Dispatch Record</DialogTitle></DialogHeader>
          {editingRecord && (
            <EditDispatchForm
              record={editingRecord}
              destinations={DESTINATIONS}
              onSave={handleUpdateDispatch}
              onCancel={() => { setShowEditDialog(false); setEditingRecord(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EditDispatchForm = ({
  record,
  destinations,
  onSave,
  onCancel
}: {
  record: DispatchRecord;
  destinations: { label: string; value: string }[];
  onSave: (record: DispatchRecord) => void;
  onCancel: () => void;
}) => {
  const [destination, setDestination] = useState(record.dispatch_destination);
  const [quantity, setQuantity] = useState(record.quantity_dispatched.toString());
  const [dispatchedBy, setDispatchedBy] = useState(record.dispatched_by);
  const [notes, setNotes] = useState(record.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...record,
      dispatch_destination: destination,
      quantity_dispatched: parseFloat(quantity),
      dispatched_by: dispatchedBy,
      notes: notes || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Destination</Label>
        <Select value={destination} onValueChange={setDestination}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {destinations.map(dest => <SelectItem key={dest.value} value={dest.value}>{dest.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Quantity</Label>
        <Input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} required />
      </div>
      <div>
        <Label>Dispatched By</Label>
        <Input value={dispatchedBy} onChange={e => setDispatchedBy(e.target.value)} required />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">Save Changes</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </form>
  );
};

export default ExpiredStockDispatchPage;
