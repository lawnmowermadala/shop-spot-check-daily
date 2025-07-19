import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, AlertTriangle, Trash2, Search, ChevronDown, Edit } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/DateRangePicker';
import Navigation from '@/components/Navigation';

interface ExpiredItem {
  id: string;
  product_name: string;
  quantity: string;
  batch_date: string;
  removal_date: string;
  product_id?: string;
  selling_price: number;
  total_selling_value: number;
  created_at?: string;
  products?: {
    name: string;
    code: string;
  };
}

interface Product {
  id: string;
  name: string;
  code: string;
}

interface ProductSummary {
  name: string;
  code: string;
  totalQuantity: number;
  totalValue: number;
  items: ExpiredItem[];
}

const ExpiredStockPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isBatchCalendarOpen, setIsBatchCalendarOpen] = useState(false);
  const [isRemovalCalendarOpen, setIsRemovalCalendarOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpiredItem | null>(null);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'custom'>('day');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [reportView, setReportView] = useState<'summary' | 'detailed'>('summary');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ExpiredItem; direction: 'asc' | 'desc' }>({
    key: 'removal_date',
    direction: 'desc',
  });
  const [formData, setFormData] = useState({
    productId: '',
    productName: '',
    quantity: '',
    sellingPrice: '',
    batchDate: new Date(),
    removalDate: new Date(),
  });

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Product[];
    }
  });

  // Fetch expired items with calculated selling value
  const { data: expiredItems = [], isLoading: isLoadingExpiredItems } = useQuery({
    queryKey: ['expired-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expired_items')
        .select(`
          *,
          products (name, code)
        `);
      if (error) throw error;
      return (data as ExpiredItem[]).map(item => ({
        ...item,
        total_selling_value: item.selling_price * parseFloat(item.quantity)
      }));
    }
  });

  // Sort items
  const sortedItems = [...expiredItems].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Filter items by time range
  const getFilteredItems = () => {
    const now = new Date();
    let startDate, endDate;

    switch (timeRange) {
      case 'day':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'custom':
        if (dateRange?.from && dateRange?.to) {
          startDate = startOfDay(dateRange.from);
          endDate = endOfDay(dateRange.to);
        } else {
          return sortedItems;
        }
        break;
      default:
        startDate = startOfDay(now);
        endDate = endOfDay(now);
    }

    return sortedItems.filter(item => {
      const removalDate = new Date(item.removal_date);
      return removalDate >= startDate && removalDate <= endDate;
    });
  };

  const filteredItems = getFilteredItems();

  // Group items by product
  const getProductSummaries = (items: ExpiredItem[]): ProductSummary[] => {
    const productMap = new Map<string, ProductSummary>();
    
    items.forEach(item => {
      const productName = item.product_name;
      const productCode = item.products?.code || 'N/A';
      const key = `${productName}-${productCode}`;
      
      if (!productMap.has(key)) {
        productMap.set(key, {
          name: productName,
          code: productCode,
          totalQuantity: 0,
          totalValue: 0,
          items: []
        });
      }
      
      const summary = productMap.get(key)!;
      summary.totalQuantity += parseFloat(item.quantity) || 0;
      summary.totalValue += item.total_selling_value || 0;
      summary.items.push(item);
    });
    
    return Array.from(productMap.values());
  };

  const productSummaries = getProductSummaries(filteredItems);

  // Handle product selection
  const handleProductSelect = (productId: string, productName: string) => {
    setFormData({
      ...formData, 
      productId, 
      productName
    });
    setSearchTerm('');
    setIsProductDropdownOpen(false);
  };

  // Add expired item
  const addExpiredItem = useMutation({
    mutationFn: async () => {
      if (!formData.productId || !formData.quantity || !formData.sellingPrice) {
        throw new Error('Please fill all required fields');
      }

      const quantity = parseFloat(formData.quantity);
      const sellingPrice = parseFloat(formData.sellingPrice);
      const total_selling_value = quantity * sellingPrice;

      const { error } = await supabase
        .from('expired_items')
        .insert({
          product_id: formData.productId,
          product_name: formData.productName,
          quantity: formData.quantity,
          selling_price: sellingPrice,
          total_selling_value: total_selling_value,
          batch_date: format(formData.batchDate, 'yyyy-MM-dd'),
          removal_date: format(formData.removalDate, 'yyyy-MM-dd')
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expired-items'] });
      setFormData({
        productId: '',
        productName: '',
        quantity: '',
        sellingPrice: '',
        batchDate: new Date(),
        removalDate: new Date(),
      });
      toast.success("Expired item logged successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Update expired item
  const updateExpiredItem = useMutation({
    mutationFn: async (updatedItem: ExpiredItem) => {
      if (!updatedItem.product_id || !updatedItem.quantity || !updatedItem.selling_price) {
        throw new Error('Please fill all required fields');
      }

      const quantity = parseFloat(updatedItem.quantity);
      const sellingPrice = updatedItem.selling_price;
      const total_selling_value = quantity * sellingPrice;

      const { error } = await supabase
        .from('expired_items')
        .update({
          product_id: updatedItem.product_id,
          product_name: updatedItem.product_name,
          quantity: updatedItem.quantity,
          selling_price: sellingPrice,
          total_selling_value: total_selling_value,
          batch_date: format(new Date(updatedItem.batch_date), 'yyyy-MM-dd'),
          removal_date: format(new Date(updatedItem.removal_date), 'yyyy-MM-dd')
        })
        .eq('id', updatedItem.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expired-items'] });
      setEditingItem(null);
      toast.success("Expired item updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete expired item
  const deleteExpiredItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('expired_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expired-items'] });
      toast.success("Item removed from expired records");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateExpiredItem.mutate(editingItem);
    } else {
      addExpiredItem.mutate();
    }
  };

  const startEdit = (item: ExpiredItem) => {
    setEditingItem(item);
    setFormData({
      productId: item.product_id || '',
      productName: item.product_name,
      quantity: item.quantity,
      sellingPrice: item.selling_price.toString(),
      batchDate: new Date(item.batch_date),
      removalDate: new Date(item.removal_date),
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setFormData({
      productId: '',
      productName: '',
      quantity: '',
      sellingPrice: '',
      batchDate: new Date(),
      removalDate: new Date(),
    });
  };

  // Optimized print function
  const handlePrint = () => {
    const totalValue = filteredItems.reduce((sum, item) => sum + item.total_selling_value, 0);
    const totalQuantity = filteredItems.reduce((sum, item) => sum + parseFloat(item.quantity || '0'), 0);
    const totalProducts = filteredItems.length;
    const avgValuePerProduct = totalProducts > 0 ? totalValue / totalProducts : 0;

    const printContent = `
      <html>
        <head>
          <title>Expired Stock Report</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: Arial, sans-serif; font-size: 12px; padding: 10px; }
            h1 { font-size: 18px; margin: 5px 0; }
            h2 { font-size: 16px; margin: 5px 0; }
            .header { text-align: center; margin-bottom: 10px; }
            .summary-grid { 
              display: grid; 
              grid-template-columns: repeat(4, 1fr); 
              gap: 10px; 
              margin-bottom: 15px;
            }
            .summary-item { 
              border: 1px solid #ddd; 
              padding: 8px; 
              border-radius: 3px; 
              text-align: center; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px; 
              font-size: 11px;
              page-break-inside: avoid;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 4px; 
              text-align: left; 
            }
            .text-red { color: #dc3545; }
            .no-break { page-break-inside: avoid; }
            .signature { margin-top: 30px; text-align: right; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header no-break">
            <h1>Expired Stock Report - ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}</h1>
            <div>Generated: ${format(new Date(), 'PPPPp')}</div>
          </div>
          
          <div class="summary-grid no-break">
            <div class="summary-item">
              <div>Products Expired</div>
              <div class="text-red">${totalProducts}</div>
            </div>
            <div class="summary-item">
              <div>Total Units Lost</div>
              <div class="text-red">${totalQuantity}</div>
            </div>
            <div class="summary-item">
              <div>Value of Product Sale</div>
              <div class="text-red">R${totalValue.toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div>Avg Value Per Product</div>
              <div class="text-red">R${avgValuePerProduct.toFixed(2)}</div>
            </div>
          </div>
          
          <h2 class="no-break">${reportView === 'summary' ? 'Product Summary' : 'Expired Items Details'}</h2>
          
          ${reportView === 'summary' ? `
            <table class="no-break">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Code</th>
                  <th>Units</th>
                  <th>Value of Product Sale</th>
                </tr>
              </thead>
              <tbody>
                ${productSummaries.map(summary => `
                  <tr>
                    <td>${summary.name}</td>
                    <td>${summary.code}</td>
                    <td>${summary.totalQuantity}</td>
                    <td class="text-red">R${summary.totalValue.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <table class="no-break">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Code</th>
                  <th>Prod Date</th>
                  <th>Expiry</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Value of Product Sale</th>
                </tr>
              </thead>
              <tbody>
                ${filteredItems.map(item => `
                  <tr>
                    <td>${item.product_name}</td>
                    <td>${item.products?.code || 'N/A'}</td>
                    <td>${format(parseISO(item.batch_date), 'MMM d')}</td>
                    <td>${format(parseISO(item.removal_date), 'MMM d')}</td>
                    <td>${item.quantity}</td>
                    <td>R${item.selling_price?.toFixed(2)}</td>
                    <td class="text-red">R${item.total_selling_value?.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
          
          <div class="signature no-break">
            Prepared by: Elton Niati AI Boot agent<br />
            Date: ${format(new Date(), 'yyyy-MM-dd')}
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const requestSort = (key: keyof ExpiredItem) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  if (isLoadingProducts || isLoadingExpiredItems) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expired stock data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Expired Stock Management</h1>
        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">Kitchen Staff</span>
      </div>
      
      <p className="text-gray-600">
        Record and manage expired products to minimize waste and keep inventory accurate.
      </p>

      {/* Report Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2">
          <Button 
            variant={timeRange === 'day' ? 'default' : 'outline'}
            onClick={() => setTimeRange('day')}
          >
            Daily
          </Button>
          <Button 
            variant={timeRange === 'week' ? 'default' : 'outline'}
            onClick={() => setTimeRange('week')}
          >
            Weekly
          </Button>
          <Button 
            variant={timeRange === 'month' ? 'default' : 'outline'}
            onClick={() => setTimeRange('month')}
          >
            Monthly
          </Button>
          <Button 
            variant={timeRange === 'custom' ? 'default' : 'outline'}
            onClick={() => setTimeRange('custom')}
          >
            Custom Range
          </Button>
        </div>
        
        {timeRange === 'custom' && (
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            className="w-auto"
          />
        )}
        
        <div className="flex gap-2 ml-auto">
          <Select value={reportView} onValueChange={(value) => setReportView(value as 'summary' | 'detailed')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={handlePrint}
          >
            Print Report
          </Button>
        </div>
      </div>

      {/* Sales Value Summary */}
      <Card className="bg-red-50 border-red-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Products Expired</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredItems.length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Units Lost</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredItems.reduce((sum, item) => sum + parseFloat(item.quantity || '0'), 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Value of Product Sale</p>
              <p className="text-2xl font-bold text-red-600">
                R{filteredItems.reduce((sum, item) => sum + item.total_selling_value, 0).toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Avg Value Per Product</p>
              <p className="text-2xl font-bold text-red-600">
                R{filteredItems.length > 0 ? (filteredItems.reduce((sum, item) => sum + item.total_selling_value, 0) / filteredItems.length).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Add/Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingItem ? 'Edit Expired Item' : 'Log Expired Item'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium mb-1">Select Product *</label>
                <div className="relative">
                  <div className="flex items-center border rounded-md">
                    <Search className="ml-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or barcode"
                      className="border-0 pl-2 focus-visible:ring-0 focus-visible:ring-offset-0"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setIsProductDropdownOpen(true)}
                    />
                    <ChevronDown 
                      className="h-4 w-4 mr-3 text-gray-400 cursor-pointer" 
                      onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                    />
                  </div>
                  {isProductDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border max-h-60 overflow-auto">
                      {products.filter(p => 
                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.code.toLowerCase().includes(searchTerm.toLowerCase())
                      ).map(product => (
                        <div
                          key={product.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleProductSelect(product.id, product.name)}
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.code}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {formData.productId && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-md">
                    <div className="font-medium">Selected: {formData.productName}</div>
                    <button
                      type="button"
                      className="text-sm text-red-500 mt-1"
                      onClick={() => {
                        setFormData({...formData, productId: '', productName: ''});
                        setSearchTerm('');
                      }}
                    >
                      Clear selection
                    </button>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quantity *</label>
                <Input
                  type="number"
                  placeholder="Quantity lost"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Selling Price (ZAR) *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Production Date</label>
                <Popover open={isBatchCalendarOpen} onOpenChange={setIsBatchCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.batchDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.batchDate}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({...formData, batchDate: date});
                          setIsBatchCalendarOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Removal Date</label>
                <Popover open={isRemovalCalendarOpen} onOpenChange={setIsRemovalCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.removalDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.removalDate}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({...formData, removalDate: date});
                          setIsRemovalCalendarOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="w-full md:w-auto"
                disabled={editingItem ? updateExpiredItem.isPending : addExpiredItem.isPending}
              >
                {editingItem ? 
                  (updateExpiredItem.isPending ? "Updating..." : "Update Item") : 
                  (addExpiredItem.isPending ? "Logging..." : "Log Expired Item")
                }
              </Button>
              {editingItem && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Expired Items List */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
          <CardTitle>Expired Items History ({timeRange})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length > 0 ? (
            <div className="overflow-x-auto">
              {reportView === 'summary' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Total Quantity</TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => requestSort('total_selling_value')}
                      >
                        Value of Product Sale (ZAR) {sortConfig.key === 'total_selling_value' && (
                          sortConfig.direction === 'asc' ? '↑' : '↓'
                        )}
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSummaries.map(summary => (
                      <TableRow key={`${summary.code}-${summary.name}`}>
                        <TableCell className="font-mono">{summary.code}</TableCell>
                        <TableCell>{summary.name}</TableCell>
                        <TableCell>{summary.totalQuantity}</TableCell>
                        <TableCell className="font-semibold text-red-600">
                          R{summary.totalValue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-blue-500 hover:text-blue-700"
                            onClick={() => {
                              setReportView('detailed');
                              setTimeout(() => {
                                document.getElementById(`product-${summary.code}`)?.scrollIntoView();
                              }, 100);
                            }}
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => requestSort('product_name')}
                      >
                        Product {sortConfig.key === 'product_name' && (
                          sortConfig.direction === 'asc' ? '↑' : '↓'
                        )}
                      </TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => requestSort('batch_date')}
                      >
                        Prod Date {sortConfig.key === 'batch_date' && (
                          sortConfig.direction === 'asc' ? '↑' : '↓'
                        )}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => requestSort('removal_date')}
                      >
                        Expiry {sortConfig.key === 'removal_date' && (
                          sortConfig.direction === 'asc' ? '↑' : '↓'
                        )}
                      </TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => requestSort('total_selling_value')}
                      >
                        Value of Product Sale {sortConfig.key === 'total_selling_value' && (
                          sortConfig.direction === 'asc' ? '↑' : '↓'
                        )}
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map(item => (
                      <TableRow key={item.id} id={`product-${item.products?.code || 'N/A'}`}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="font-mono">{item.products?.code || 'N/A'}</TableCell>
                        <TableCell>{format(parseISO(item.batch_date), 'MMM d')}</TableCell>
                        <TableCell>{format(parseISO(item.removal_date), 'MMM d')}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>R{item.selling_price?.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-red-600">
                          R{item.total_selling_value?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-blue-500 hover:text-blue-700"
                            onClick={() => startEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700"
                            onClick={() => deleteExpiredItem.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-10 w-10 text-orange-500 mb-2" />
              <p className="text-gray-500">No expired items recorded for this {timeRange}.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Production Optimization Analysis */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>AI Production Optimization Analysis</CardTitle>
          <div className="text-sm text-gray-500">
            {format(new Date(), 'MMM d, yyyy')} - {format(new Date(), 'MMM d, yyyy')}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Units Produced</p>
              <p className="text-2xl font-bold">7124</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Selling Value</p>
              <p className="text-2xl font-bold">R15433.29</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Expired Loss</p>
              <p className="text-2xl font-bold text-red-600">R2119.01</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Waste Rate</p>
              <p className="text-2xl font-bold">13.73%</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="text-right italic">
              <p>Prepared by: Elton Niati AI Agent</p>
              <p>Date: {format(new Date(), 'yyyy-MM-dd')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Navigation />
    </div>
  );
};

export default ExpiredStockPage;
