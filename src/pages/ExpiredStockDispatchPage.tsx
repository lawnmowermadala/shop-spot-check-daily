
import React, { useState, useEffect } from 'react';
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
import { Printer, CalendarIcon, Filter } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface ExpiredItem {
  id: string;
  product_name: string;
  quantity: string;
  batch_date: string;
  removal_date: string;
  created_at?: string;
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

const ExpiredStockDispatchPage = () => {
  const [expiredItems, setExpiredItems] = useState<ExpiredItem[]>([]);
  const [dispatchRecords, setDispatchRecords] = useState<DispatchRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DispatchRecord[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [quantityToDispatch, setQuantityToDispatch] = useState<string>("");
  const [dispatchedBy, setDispatchedBy] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter states
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [showFilters, setShowFilters] = useState(false);
  
  const { toast } = useToast();

  const destinations = [
    "Pig Food Production",
    "Dog Food Production", 
    "Ginger Biscuit Production"
  ];

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
      toast({
        title: "Error",
        description: "Failed to load expired items",
        variant: "destructive",
      });
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

  const calculateRemainingQuantity = (itemId: string, originalQuantity: string) => {
    const totalDispatched = dispatchRecords
      .filter(record => record.expired_item_id === itemId)
      .reduce((sum, record) => sum + record.quantity_dispatched, 0);
    
    return parseFloat(originalQuantity) - totalDispatched;
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
    const remainingQuantity = calculateRemainingQuantity(selectedItemId, selectedItem.quantity);

    if (dispatchQuantity > remainingQuantity) {
      toast({
        title: "Error",
        description: `Dispatch quantity cannot exceed remaining quantity (${remainingQuantity})`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('expired_stock_dispatches')
        .insert({
          expired_item_id: selectedItemId,
          dispatch_destination: destination,
          quantity_dispatched: dispatchQuantity,
          dispatched_by: dispatchedBy,
          notes: notes || null,
          dispatch_date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

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
      
      // Refresh dispatch records
      fetchDispatchRecords();

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

  const handlePrint = () => {
    window.print();
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

  const selectedItem = expiredItems.find(item => item.id === selectedItemId);
  const remainingQuantity = selectedItem ? calculateRemainingQuantity(selectedItemId, selectedItem.quantity) : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center print:justify-center">
        <h1 className="text-3xl font-bold">Expired Stock Dispatch</h1>
        <Button 
          onClick={handlePrint}
          variant="outline"
          size="sm"
          className="print:hidden"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Report
        </Button>
      </div>
      
      {/* Filter Controls */}
      <Card className="print:hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Filter Dispatch Records</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fromDate ? format(fromDate, "PPP") : "Pick start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={fromDate}
                          onSelect={setFromDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label>To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {toDate ? format(toDate, "PPP") : "Pick end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={toDate}
                          onSelect={setToDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
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
                    {expiredItems.map((item) => {
                      const remaining = calculateRemainingQuantity(item.id, item.quantity);
                      return (
                        <SelectItem key={item.id} value={item.id} disabled={remaining <= 0}>
                          {item.product_name} - Available: {remaining} (Batch: {item.batch_date})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedItem && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p><strong>Product:</strong> {selectedItem.product_name}</p>
                  <p><strong>Original Quantity:</strong> {selectedItem.quantity}</p>
                  <p><strong>Available Quantity:</strong> {remainingQuantity}</p>
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
                  max={remainingQuantity}
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

        {/* Dispatch History */}
        <Card className="print:col-span-2">
          <CardHeader>
            <CardTitle>{getPeriodLabel()}</CardTitle>
            <p className="text-sm text-gray-600">
              Showing {filteredRecords.length} of {dispatchRecords.length} total dispatches
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto print:max-h-none print:overflow-visible">
              {filteredRecords.length === 0 ? (
                <p className="text-gray-500">No dispatches found for the selected period</p>
              ) : (
                filteredRecords.map((record) => {
                  const item = expiredItems.find(i => i.id === record.expired_item_id);
                  return (
                    <div key={record.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item?.product_name || 'Unknown Item'}</p>
                          <p className="text-sm text-gray-600">To: {record.dispatch_destination}</p>
                          <p className="text-sm text-gray-600">Quantity: {record.quantity_dispatched}</p>
                          <p className="text-sm text-gray-600">By: {record.dispatched_by}</p>
                        </div>
                        <span className="text-xs text-gray-500">{record.dispatch_date}</span>
                      </div>
                      {record.notes && (
                        <p className="text-sm text-gray-600 mt-2">Notes: {record.notes}</p>
                      )}
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
        {destinations.map((dest) => {
          const totalDispatched = filteredRecords
            .filter(record => record.dispatch_destination === dest)
            .reduce((sum, record) => sum + record.quantity_dispatched, 0);
          
          return (
            <Card key={dest}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="font-medium">{dest}</h3>
                  <p className="text-2xl font-bold text-blue-600">{totalDispatched}</p>
                  <p className="text-sm text-gray-600">Total Dispatched</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ExpiredStockDispatchPage;
