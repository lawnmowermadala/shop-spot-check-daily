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
import ProductionAnalysisReport from '@/components/ProductionAnalysisReport';
import Navigation from '@/components/Navigation';

// Types
interface ExpiredItem {
  id: string;
  product_name: string;
  quantity: string;
  batch_date: string;
  removal_date: string;
  product_id?: string;
  selling_price: number;
  total_cost_loss: number;
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
  totalLoss: number;
  items: ExpiredItem[];
}

const ExpiredStockPage = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isBatchCalendarOpen, setIsBatchCalendarOpen] = useState(false);
  const [isRemovalCalendarOpen, setIsRemovalCalendarOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpiredItem | null>(null);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'custom'>('day');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [reportView, setReportView] = useState<'summary' | 'detailed'>('summary');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ExpiredItem; direction: 'asc' | 'desc' }>({
    key: 'total_cost_loss',
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
  const { data: products = [] } = useQuery({
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

  // Fetch expired items with product details
  const { data: expiredItems = [], isLoading } = useQuery({
    queryKey: ['expired-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expired_items')
        .select(`
          *,
          products (name, code)
        `)
        .order('removal_date', { ascending: false });
      
      if (error) throw error;
      return data as ExpiredItem[];
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

  // Get filtered items based on time range
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
          return sortedItems; // Return all items if no custom range selected
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

  // Group items by product for summary view
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
          totalLoss: 0,
          items: []
        });
      }
      
      const summary = productMap.get(key)!;
      summary.totalQuantity += parseFloat(item.quantity) || 0;
      summary.totalLoss += item.total_cost_loss || 0;
      summary.items.push(item);
    });
    
    return Array.from(productMap.values());
  };

  const productSummaries = getProductSummaries(filteredItems);

  // Request sort
  const requestSort = (key: keyof ExpiredItem) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

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

  // Add expired item mutation
  const addExpiredItem = useMutation({
    mutationFn: async () => {
      if (!formData.productId || !formData.quantity || !formData.sellingPrice) {
        throw new Error('Please fill all required fields');
      }

      const { error } = await supabase
        .from('expired_items')
        .insert({
          product_id: formData.productId,
          product_name: formData.productName,
          quantity: formData.quantity,
          selling_price: parseFloat(formData.sellingPrice),
          batch_date: format(formData.batchDate, 'yyyy-MM-dd'),
          removal_date: format(formData.removalDate, 'yyyy-MM-dd')
          // Let the database calculate total_cost_loss
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

  // Update expired item mutation
  const updateExpiredItem = useMutation({
    mutationFn: async (updatedItem: ExpiredItem) => {
      if (!updatedItem.product_id || !updatedItem.quantity || !updatedItem.selling_price) {
        throw new Error('Please fill all required fields');
      }

      const { error } = await supabase
        .from('expired_items')
        .update({
          product_id: updatedItem.product_id,
          product_name: updatedItem.product_name,
          quantity: updatedItem.quantity,
          selling_price: updatedItem.selling_price,
          batch_date: format(new Date(updatedItem.batch_date), 'yyyy-MM-dd'),
          removal_date: format(new Date(updatedItem.removal_date), 'yyyy-MM-dd')
          // Let the database calculate total_cost_loss
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

  // Delete expired item mutation
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

  // Print report function
  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Expired Stock Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1, h2, h3 { color: #333; }
            .header { text-align: center; margin-bottom: 20px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .summary-item { border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
            .summary-value { font-size: 1.5rem; font-weight: bold; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .product-group { margin-top: 30px; }
            .product-header { background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
            .text-red { color: #dc3545; }
            .text-bold { font-weight: bold; }
            .page-break { page-break-after: always; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Expired Stock Report</h1>
            <h3>${format(new Date(), 'PPPP')}</h3>
            <h2>${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} Summary</h2>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div>Total Items Lost</div>
              <div class="summary-value">${filteredItems.reduce((sum, item) => sum + parseFloat(item.quantity || '0'), 0)}</div>
            </div>
            <div class="summary-item">
              <div>Total Financial Loss</div>
              <div class="summary-value text-red">R${filteredItems.reduce((sum, item) => sum + (item.total_cost_loss || 0), 0).toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div>Average Loss Per Item</div>
              <div class="summary-value">R${filteredItems.length > 0 ? (filteredItems.reduce((sum, item) => sum + (item.total_cost_loss || 0), 0) / filteredItems.length).toFixed(2) : '0.00'}</div>
            </div>
          </div>
          
          <h2>${reportView === 'summary' ? 'Product Summary' : 'Detailed Items'}</h2>
          
          ${reportView === 'summary' ? `
            <table>
              <thead>
                <tr>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th>Total Quantity</th>
                  <th>Total Loss (ZAR)</th>
                </tr>
              </thead>
              <tbody>
                ${productSummaries.map(summary => `
                  <tr>
                    <td>${summary.code}</td>
                    <td>${summary.name}</td>
                    <td>${summary.totalQuantity}</td>
                    <td class="text-red">R${summary.totalLoss.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
             <table>
               <thead>
                 <tr>
                   <th>Production Date</th>
                   <th>Removal Date</th>
                   <th>Product Code</th>
                   <th>Product Name</th>
                   <th>Quantity</th>
                   <th>Unit Price</th>
                   <th>Total Loss</th>
                 </tr>
               </thead>
              <tbody>
                 ${filteredItems.map(item => `
                   <tr>
                     <td>${format(parseISO(item.batch_date), 'MMM d, yyyy')}</td>
                     <td>${format(parseISO(item.removal_date), 'MMM d, yyyy')}</td>
                     <td>${item.products?.code || 'N/A'}</td>
                     <td>${item.product_name}</td>
                     <td>${item.quantity}</td>
                     <td>R${item.selling_price?.toFixed(2)}</td>
                     <td class="text-red">R${item.total_cost_loss?.toFixed(2)}</td>
                   </tr>
                 `).join('')}
              </tbody>
            </table>
          `}
          
          ${reportView === 'summary' ? `
            <div class="page-break"></div>
            <h2>Detailed Breakdown by Product</h2>
            ${productSummaries.map(summary => `
              <div class="product-group">
                <div class="product-header">
                  <h3>${summary.name} (${summary.code})</h3>
                  <div>Total: ${summary.totalQuantity} units | R${summary.totalLoss.toFixed(2)}</div>
                </div>
                <table>
                  <thead>
                     <tr>
                      <th>Production Date</th>
                      <th>Removal Date</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total Loss</th>
                     </tr>
                  </thead>
                  <tbody>
                     ${summary.items.map(item => `
                       <tr>
                         <td>${format(parseISO(item.batch_date), 'MMM d, yyyy')}</td>
                         <td>${format(parseISO(item.removal_date), 'MMM d, yyyy')}</td>
                         <td>${item.quantity}</td>
                         <td>R${item.selling_price?.toFixed(2)}</td>
                         <td class="text-red">R${item.total_cost_loss?.toFixed(2)}</td>
                       </tr>
                     `).join('')}
                  </tbody>
                </table>
              </div>
            `).join('')}
          ` : ''}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.focus();
    setTimeout(() => {
      printWindow?.print();
    }, 500);
  };

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

      {/* Loss Summary */}
      <Card className="bg-red-50 border-red-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Items Lost ({timeRange})</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredItems.reduce((sum, item) => sum + parseFloat(item.quantity || '0'), 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Financial Loss ({timeRange})</p>
              <p className="text-2xl font-bold text-red-600">
                R{filteredItems.reduce((sum, item) => sum + (item.total_cost_loss || 0), 0).toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Average Loss Per Item ({timeRange})</p>
              <p className="text-2xl font-bold text-red-600">
                R{filteredItems.length > 0 ? (filteredItems.reduce((sum, item) => sum + (item.total_cost_loss || 0), 0) / filteredItems.length).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Add/Edit Expired Item Form */}
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
                <label className="block text-sm font-medium mb-1">Selling Price Per Unit (ZAR) *</label>
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
          {isLoading ? (
            <div className="text-center py-4">Loading expired items...</div>
          ) : filteredItems.length > 0 ? (
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
                        onClick={() => requestSort('total_cost_loss')}
                      >
                        Total Loss (ZAR) {sortConfig.key === 'total_cost_loss' && (
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
                          R{summary.totalLoss.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-blue-500 hover:text-blue-700"
                            onClick={() => {
                              setReportView('detailed');
                              // Scroll to the first item of this product
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
                       <TableHead>Production Date</TableHead>
                       <TableHead>Removal Date</TableHead>
                       <TableHead>Product Code</TableHead>
                       <TableHead>Product Name</TableHead>
                       <TableHead>Quantity</TableHead>
                       <TableHead>Unit Price</TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => requestSort('total_cost_loss')}
                      >
                        Total Loss (ZAR) {sortConfig.key === 'total_cost_loss' && (
                          sortConfig.direction === 'asc' ? '↑' : '↓'
                        )}
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map(item => (
                       <TableRow key={item.id} id={`product-${item.products?.code || 'N/A'}`}>
                         <TableCell>{format(parseISO(item.batch_date), 'MMM d, yyyy')}</TableCell>
                         <TableCell>{format(parseISO(item.removal_date), 'MMM d, yyyy')}</TableCell>
                         <TableCell className="font-mono">{item.products?.code || 'N/A'}</TableCell>
                         <TableCell>{item.product_name}</TableCell>
                         <TableCell>{item.quantity}</TableCell>
                         <TableCell>R{item.selling_price?.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-red-600">
                          R{item.total_cost_loss?.toFixed(2)}
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

      {/* AI Production Analysis Report */}
      <ProductionAnalysisReport />
      
      <Navigation />
    </div>
  );
};

export default ExpiredStockPage;
