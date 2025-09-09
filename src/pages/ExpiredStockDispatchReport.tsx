import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, Printer, FileText } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/DateRangePicker';
import Navigation from '@/components/Navigation';

interface DispatchRecord {
  id: string;
  expired_item_id: string;
  dispatch_destination: string;
  quantity_dispatched: number;
  dispatch_date: string;
  dispatched_by: string;
  notes?: string;
  created_at: string;
}

interface ExpiredItem {
  id: string;
  product_name: string;
  quantity: string;
  batch_date: string;
  removal_date: string;
  total_cost_loss: number;
  selling_price: number;
}

const ExpiredStockDispatchReport = () => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [reportView, setReportView] = useState<'summary' | 'detailed' | 'destination'>('summary');

  const destinations = [
    { label: "Pig Feed", value: "pig_feed" },
    { label: "Dog Food Production", value: "dog_feed" }, 
    { label: "Ginger Biscuit Production", value: "ginger_biscuit" },
    { label: "Banana Bread", value: "banana_bread" }
  ];

  const getDestinationLabel = (value: string) => {
    return destinations.find(d => d.value === value)?.label || value;
  };

  // Fetch dispatch records with expired item details
  const { data: dispatchRecords = [], isLoading } = useQuery({
    queryKey: ['dispatch-records-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expired_stock_dispatches')
        .select(`
          *,
          expired_item:expired_items!inner(
            id,
            product_name,
            quantity,
            batch_date,
            removal_date,
            total_cost_loss,
            selling_price
          )
        `)
        .order('dispatch_date', { ascending: false });
      
      if (error) throw error;
      return data.map(record => ({
        ...record,
        expired_item: Array.isArray(record.expired_item) ? record.expired_item[0] : record.expired_item
      })) as (DispatchRecord & { expired_item: ExpiredItem })[];
    }
  });

  // Get filtered records based on time range
  const getFilteredRecords = () => {
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
          return dispatchRecords;
        }
        break;
      default:
        startDate = startOfDay(now);
        endDate = endOfDay(now);
    }

    return dispatchRecords.filter(record => {
      const dispatchDate = new Date(record.dispatch_date);
      return dispatchDate >= startDate && dispatchDate <= endDate;
    });
  };

  const filteredRecords = getFilteredRecords();

  // Calculate summary statistics
  const totalDispatched = filteredRecords.reduce((sum, record) => sum + record.quantity_dispatched, 0);
  const totalValueDispatched = filteredRecords.reduce((sum, record) => {
    const unitPrice = record.expired_item?.selling_price || 0;
    return sum + (record.quantity_dispatched * unitPrice);
  }, 0);

  // Group by destination
  const destinationSummary = filteredRecords.reduce((acc, record) => {
    const dest = record.dispatch_destination;
    if (!acc[dest]) {
      acc[dest] = {
        destination: dest,
        totalQuantity: 0,
        totalValue: 0,
        recordCount: 0,
        records: []
      };
    }
    acc[dest].totalQuantity += record.quantity_dispatched;
    acc[dest].totalValue += record.quantity_dispatched * (record.expired_item?.selling_price || 0);
    acc[dest].recordCount += 1;
    acc[dest].records.push(record);
    return acc;
  }, {} as Record<string, any>);

  // Group by dispatcher
  const dispatcherSummary = filteredRecords.reduce((acc, record) => {
    const dispatcher = record.dispatched_by;
    if (!acc[dispatcher]) {
      acc[dispatcher] = {
        dispatcher,
        totalQuantity: 0,
        totalValue: 0,
        recordCount: 0
      };
    }
    acc[dispatcher].totalQuantity += record.quantity_dispatched;
    acc[dispatcher].totalValue += record.quantity_dispatched * (record.expired_item?.selling_price || 0);
    acc[dispatcher].recordCount += 1;
    return acc;
  }, {} as Record<string, any>);

  // Print report function
  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Expired Stock Dispatch Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.4; }
            h1, h2, h3 { color: #333; margin-bottom: 10px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
            .summary-item { border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
            .summary-value { font-size: 1.5rem; font-weight: bold; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-green { color: #28a745; }
            .text-blue { color: #007bff; }
            .section { margin-top: 30px; }
            .page-break { page-break-after: always; }
            @media print {
              body { margin: 0; font-size: 11px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Expired Stock Dispatch Report</h1>
            <h3>${format(new Date(), 'PPPP')}</h3>
            <h2>${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} Period</h2>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div>Total Records</div>
              <div class="summary-value text-blue">${filteredRecords.length}</div>
            </div>
            <div class="summary-item">
              <div>Total Quantity Dispatched</div>
              <div class="summary-value text-green">${totalDispatched}</div>
            </div>
            <div class="summary-item">
              <div>Total Value Dispatched</div>
              <div class="summary-value text-green">R${totalValueDispatched.toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div>Unique Destinations</div>
              <div class="summary-value text-blue">${Object.keys(destinationSummary).length}</div>
            </div>
          </div>

          <div class="section">
            <h2>Dispatch by Destination</h2>
            <table>
              <thead>
                <tr>
                  <th>Destination</th>
                  <th>Total Quantity</th>
                  <th>Total Value (ZAR)</th>
                  <th>Number of Dispatches</th>
                  <th>Average per Dispatch</th>
                </tr>
              </thead>
              <tbody>
                ${Object.values(destinationSummary).map((dest: any) => `
                  <tr>
                    <td>${getDestinationLabel(dest.destination)}</td>
                    <td class="text-green">${dest.totalQuantity}</td>
                    <td class="text-green">R${dest.totalValue.toFixed(2)}</td>
                    <td>${dest.recordCount}</td>
                    <td>${(dest.totalQuantity / dest.recordCount).toFixed(1)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section page-break">
            <h2>Dispatch by Staff Member</h2>
            <table>
              <thead>
                <tr>
                  <th>Dispatched By</th>
                  <th>Total Quantity</th>
                  <th>Total Value (ZAR)</th>
                  <th>Number of Dispatches</th>
                </tr>
              </thead>
              <tbody>
                ${Object.values(dispatcherSummary).map((dispatcher: any) => `
                  <tr>
                    <td>${dispatcher.dispatcher}</td>
                    <td class="text-green">${dispatcher.totalQuantity}</td>
                    <td class="text-green">R${dispatcher.totalValue.toFixed(2)}</td>
                    <td>${dispatcher.recordCount}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Detailed Dispatch Records</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Destination</th>
                  <th>Dispatched By</th>
                  <th>Value (ZAR)</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRecords.map(record => `
                  <tr>
                    <td>${format(parseISO(record.dispatch_date), 'MMM d, yyyy')}</td>
                    <td>${record.expired_item?.product_name || 'Unknown'}</td>
                    <td>${record.quantity_dispatched}</td>
                    <td>${getDestinationLabel(record.dispatch_destination)}</td>
                    <td>${record.dispatched_by}</td>
                    <td class="text-green">R${(record.quantity_dispatched * (record.expired_item?.selling_price || 0)).toFixed(2)}</td>
                    <td>${record.notes || '-'}</td>
                  </tr>
                `).join('')}
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
    setTimeout(() => {
      printWindow?.print();
    }, 500);
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Expired Stock Dispatch Report</h1>
        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Dispatch Management</span>
      </div>
      
      <p className="text-gray-600">
        Comprehensive reporting on expired stock dispatch operations and destination analysis.
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
          <Select value={reportView} onValueChange={(value) => setReportView(value as 'summary' | 'detailed' | 'destination')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
              <SelectItem value="destination">By Destination</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{filteredRecords.length}</div>
            <p className="text-sm text-gray-600">Total Dispatch Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-green-600">{totalDispatched}</div>
            <p className="text-sm text-gray-600">Total Quantity Dispatched</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-green-600">R{totalValueDispatched.toFixed(2)}</div>
            <p className="text-sm text-gray-600">Total Value Dispatched</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-purple-600">{Object.keys(destinationSummary).length}</div>
            <p className="text-sm text-gray-600">Unique Destinations</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Report Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dispatch Report ({timeRange})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading dispatch records...</div>
          ) : filteredRecords.length > 0 ? (
            <div className="overflow-x-auto">
              {reportView === 'summary' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Destination</TableHead>
                      <TableHead>Total Quantity</TableHead>
                      <TableHead>Total Value (ZAR)</TableHead>
                      <TableHead>Number of Dispatches</TableHead>
                      <TableHead>Average per Dispatch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(destinationSummary).map((dest: any) => (
                      <TableRow key={dest.destination}>
                        <TableCell className="font-medium">{getDestinationLabel(dest.destination)}</TableCell>
                        <TableCell className="text-green-600 font-semibold">{dest.totalQuantity}</TableCell>
                        <TableCell className="text-green-600 font-semibold">R{dest.totalValue.toFixed(2)}</TableCell>
                        <TableCell>{dest.recordCount}</TableCell>
                        <TableCell>{(dest.totalQuantity / dest.recordCount).toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {reportView === 'detailed' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispatch Date</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Dispatched By</TableHead>
                      <TableHead>Value (ZAR)</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map(record => (
                      <TableRow key={record.id}>
                        <TableCell>{format(parseISO(record.dispatch_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">{record.expired_item?.product_name || 'Unknown'}</TableCell>
                        <TableCell>{record.quantity_dispatched}</TableCell>
                        <TableCell>{getDestinationLabel(record.dispatch_destination)}</TableCell>
                        <TableCell>{record.dispatched_by}</TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          R{(record.quantity_dispatched * (record.expired_item?.selling_price || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{record.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {reportView === 'destination' && (
                <div className="space-y-6">
                  {Object.values(destinationSummary).map((dest: any) => (
                    <Card key={dest.destination} className="border-l-4 border-l-green-500">
                      <CardHeader>
                        <CardTitle className="text-lg">{getDestinationLabel(dest.destination)}</CardTitle>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Total Quantity:</span>
                            <div className="font-bold text-green-600">{dest.totalQuantity}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Total Value:</span>
                            <div className="font-bold text-green-600">R{dest.totalValue.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Dispatches:</span>
                            <div className="font-bold">{dest.recordCount}</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Product</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Value (ZAR)</TableHead>
                              <TableHead>Dispatched By</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dest.records.map((record: any) => (
                              <TableRow key={record.id}>
                                <TableCell>{format(parseISO(record.dispatch_date), 'MMM d')}</TableCell>
                                <TableCell>{record.expired_item?.product_name || 'Unknown'}</TableCell>
                                <TableCell>{record.quantity_dispatched}</TableCell>
                                <TableCell className="text-green-600 font-semibold">
                                  R{(record.quantity_dispatched * (record.expired_item?.selling_price || 0)).toFixed(2)}
                                </TableCell>
                                <TableCell>{record.dispatched_by}</TableCell>
                                <TableCell className="text-sm text-gray-600">{record.notes || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No dispatch records found for the selected {timeRange} period.
            </div>
          )}
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default ExpiredStockDispatchReport;