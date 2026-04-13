import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Printer, CalendarIcon, Filter } from "lucide-react";
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

const destinations = [
  { label: "Pig Feed", value: "pig_feed" },
  { label: "Dog Food Production", value: "dog_feed" },
  { label: "Ginger Biscuit Production", value: "ginger_biscuit" },
  { label: "Banana Bread", value: "banana_bread" },
  { label: "Kitchen Used (Cooking/Baking)", value: "kitchen_used" }
];

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
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [showFilters, setShowFilters] = useState(false);

  const [editingRecord, setEditingRecord] = useState<DispatchRecord | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchExpiredItems();
    fetchDispatchRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [dispatchRecords, filterPeriod, fromDate, toDate]);

  const applyFilters = () => {
    let filtered = [...dispatchRecords];

    if (filterPeriod !== "all") {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (filterPeriod) {
        case "today":
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case "week":
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case "month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "custom":
          if (fromDate && toDate) {
            startDate = startOfDay(fromDate);
            endDate = endOfDay(toDate);
          } else {
            setFilteredRecords(filtered);
            return;
          }
          break;
        default:
          setFilteredRecords(filtered);
          return;
      }

      filtered = filtered.filter(record => {
        const recordDate = new Date(record.dispatch_date);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }

    setFilteredRecords(filtered);
  };

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

  // Memoize remaining quantities map to avoid recalculating repeatedly
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
    const groups: Record<string, typeof availableItems> = {};
    availableItems.forEach(item => {
      if (!groups[item.product_name]) groups[item.product_name] = [];
      groups[item.product_name].push(item);
    });
    return groups;
  }, [availableItems]);

  // FIX: use useCallback and stop event propagation to avoid double-firing
  const toggleItem = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllOfProduct = useCallback((productName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const items = groupedItems[productName] || [];
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      const allSelected = items.every(item => next.has(item.id));
      if (allSelected) items.forEach(item => next.delete(item.id));
      else items.forEach(item => next.add(item.id));
      return next;
    });
  }, [groupedItems]);

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
      console.error('Error dispatching stock:', error);
      toast({ title: "Error", description: `Failed to dispatch: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (record: DispatchRecord) => {
    setEditingRecord(record);
    setShowEditDialog(true);
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
      console.error('Error updating dispatch:', error);
      toast({ title: "Error", description: "Failed to update dispatch record", variant: "destructive" });
    }
  };

  const getPeriodLabel = () => {
    switch (filterPeriod) {
      case "today": return "Today's Dispatches";
      case "week": return "This Week's Dispatches";
      case "month": return "This Month's Dispatches";
      case "custom": return `Dispatches (${fromDate ? format(fromDate, "MMM dd") : ""} - ${toDate ? format(toDate, "MMM dd, yyyy") : ""})`;
      default: return "All Dispatches";
    }
  };

  const handlePrint = () => {
    const destinationSummaries = destinations.map(dest => {
      const destRecords = filteredRecords.filter(r => r.dispatch_destination === dest.value);
      const totalDispatched = destRecords.reduce((sum, r) => sum + r.quantity_dispatched, 0);
      const totalValue = destRecords.reduce((sum, r) => {
        const item = expiredItems.find(i => i.id === r.expired_item_id);
        const unitValue = item?.cost_per_unit || item?.selling_price || 0;
        return sum + unitValue * r.quantity_dispatched;
      }, 0);
      return { label: dest.label, totalDispatched, totalValue };
    });

    const printContent = `
      <html>
        <head>
          <title>Expired Stock Dispatch Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.4; }
            h1, h2, h3 { color: #333; margin-bottom: 10px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .summary-item { border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
            .summary-value { font-size: 1.5rem; font-weight: bold; margin-top: 5px; color: #2563eb; }
            .summary-label { font-size: 0.9rem; color: #666; }
            .value-text { font-size: 1.2rem; font-weight: bold; color: #16a34a; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-green { color: #16a34a; }
            .section { margin-top: 30px; }
            @media print { body { margin: 0; font-size: 11px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Expired Stock Dispatch Report</h1>
            <h3>${format(new Date(), 'PPPP')}</h3>
            <h2>${getPeriodLabel()}</h2>
          </div>
          <h2>Dispatch Summary by Destination</h2>
          <div class="summary">
            ${destinationSummaries.map(dest => `
              <div class="summary-item">
                <div style="font-weight: bold; margin-bottom: 10px;">${dest.label}</div>
                <div class="summary-value">${dest.totalDispatched.toFixed(2)}</div>
                <div class="summary-label">Total Dispatched</div>
                <div class="value-text">R${dest.totalValue.toFixed(2)}</div>
                <div class="summary-label">Total Value</div>
              </div>
            `).join('')}
          </div>
          <div class="section">
            <h2>Detailed Dispatch Records</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Product</th><th>Quantity</th><th>Value (ZAR)</th>
                  <th>Destination</th><th>Dispatched By</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRecords.map(record => {
                  const item = expiredItems.find(i => i.id === record.expired_item_id);
                  const unitValue = item?.cost_per_unit || item?.selling_price || 0;
                  const totalValue = unitValue * record.quantity_dispatched;
                  return `
                    <tr>
                      <td>${record.dispatch_date}</td>
                      <td>${item?.product_name || 'Unknown'}</td>
                      <td>${record.quantity_dispatched}</td>
                      <td class="text-green">R${totalValue.toFixed(2)}</td>
                      <td>${destinations.find(d => d.value === record.dispatch_destination)?.label || record.dispatch_destination}</td>
                      <td>${record.dispatched_by}</td>
                      <td>${record.notes || '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.focus();
    setTimeout(() => printWindow?.print(), 500);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center print:justify-center">
        <h1 className="text-3xl font-bold">Expired Stock Dispatch</h1>
        <Button onClick={handlePrint} variant="outline" size="sm" className="print:hidden">
          <Printer className="h-4 w-4 mr-2" />
          Print Report
        </Button>
      </div>

      {/* Filter Controls */}
      <Card className="print:hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Filter Dispatch Records</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? "Hide" : "Show"} Filters
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="space-y-4">
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
                        <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className={cn("p-3 pointer-events-auto")} />
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
                        <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus className={cn("p-3 pointer-events-auto")} />
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
        <Card className="print:hidden">
          <CardHeader><CardTitle>Dispatch Expired Stock</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                        {/* FIX: only use onClick on the div, not onCheckedChange on Checkbox */}
                        <div
                          className="flex items-center gap-3 p-3 bg-muted/50 cursor-pointer hover:bg-muted"
                          onClick={(e) => selectAllOfProduct(productName, e)}
                        >
                          <Checkbox
                            checked={allSelected}
                            className={someSelected && !allSelected ? "opacity-50" : ""}
                            // FIX: removed onCheckedChange to prevent double-firing
                          />
                          <span className="font-medium">{productName}</span>
                          <span className="text-xs text-muted-foreground">
                            ({items.length} batch{items.length > 1 ? 'es' : ''})
                          </span>
                        </div>
                        {items.map(item => {
                          const remaining = remainingQuantityMap[item.id] ?? 0;
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 px-6 py-2 cursor-pointer hover:bg-accent/50 ${selectedItemIds.has(item.id) ? 'bg-accent/30' : ''}`}
                              onClick={(e) => toggleItem(item.id, e)}
                            >
                              {/* FIX: removed onCheckedChange to prevent double-firing */}
                              <Checkbox checked={selectedItemIds.has(item.id)} />
                              <div className="flex-1 text-sm">
                                <span>Qty: <strong>{remaining.toFixed(2)}</strong></span>
                                <span className="mx-2">|</span>
                                <span>Batch: {item.batch_date}</span>
                                <span className="mx-2">|</span>
                                <span>Removed: {item.removal_date}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

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
                  <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    {destinations.map(dest => (
                      <SelectItem key={dest.value} value={dest.value}>{dest.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dispatched-by">Dispatched By</Label>
                <Input id="dispatched-by" value={dispatchedBy} onChange={e => setDispatchedBy(e.target.value)} placeholder="Enter your name" />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any additional notes about this dispatch" rows={3} />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || selectedItemIds.size === 0 || !destination || !dispatchedBy}>
                {isSubmitting ? "Dispatching..." : `Dispatch ${selectedItems.length} Item(s)`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Dispatch History */}
        <Card className="print:col-span-2">
          <CardHeader>
            <CardTitle>{getPeriodLabel()}</CardTitle>
            <p className="text-sm text-gray-600">Showing {filteredRecords.length} of {dispatchRecords.length} total dispatches</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto print:max-h-none print:overflow-visible">
              {filteredRecords.length === 0 ? (
                <p className="text-gray-500">No dispatches found for the selected period</p>
              ) : (
                filteredRecords.map(record => {
                  const item = expiredItems.find(i => i.id === record.expired_item_id);
                  const unitValue = item?.cost_per_unit || item?.selling_price || 0;
                  const totalValue = unitValue * record.quantity_dispatched;
                  return (
                    <div key={record.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{item?.product_name || 'Unknown Item'}</p>
                          <p className="text-sm text-gray-600">To: {destinations.find(d => d.value === record.dispatch_destination)?.label || record.dispatch_destination}</p>
                          <p className="text-sm text-gray-600">Quantity: {record.quantity_dispatched}</p>
                          <p className="text-sm text-gray-600">Value: R{totalValue.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">By: {record.dispatched_by}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{record.dispatch_date}</span>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(record)} className="print:hidden">Edit</Button>
                        </div>
                      </div>
                      {record.notes && <p className="text-sm text-gray-600 mt-2">Notes: {record.notes}</p>}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {destinations.map(dest => {
          const destRecords = filteredRecords.filter(r => r.dispatch_destination === dest.value);
          const totalDispatched = destRecords.reduce((sum, r) => sum + r.quantity_dispatched, 0);
          const totalValue = destRecords.reduce((sum, r) => {
            const item = expiredItems.find(i => i.id === r.expired_item_id);
            const unitValue = item?.cost_per_unit || item?.selling_price || 0;
            return sum + unitValue * r.quantity_dispatched;
          }, 0);
          return (
            <Card key={dest.value}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="font-medium">{dest.label}</h3>
                  <p className="text-2xl font-bold text-blue-600">{totalDispatched}</p>
                  <p className="text-sm text-muted-foreground">Total Dispatched</p>
                  <p className="text-xl font-semibold text-green-600 mt-2">R{totalValue.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Dispatch Record</DialogTitle></DialogHeader>
          {editingRecord && (
            <EditDispatchForm
              record={editingRecord}
              destinations={destinations}
              onSave={handleUpdateDispatch}
              onCancel={() => setShowEditDialog(false)}
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
    onSave({ ...record, dispatch_destination: destination, quantity_dispatched: parseFloat(quantity), dispatched_by: dispatchedBy, notes: notes || undefined });
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
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">Save Changes</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </form>
  );
};

export default ExpiredStockDispatchPage;
