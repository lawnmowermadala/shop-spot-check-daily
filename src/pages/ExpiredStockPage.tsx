import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, AlertTriangle, Trash2, Search, ChevronDown, Edit, CheckCircle, Loader2, Printer } from 'lucide-react';
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
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit: string;
  reason?: string;
  cost_per_unit: number;
  supplier_name?: string;
  category?: string;
}

const ExpiredStockPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [timeRange, setTimeRange] = useState<string>('this month');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4.1');
  const [isPuterLoaded, setIsPuterLoaded] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<Error | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const queryClient = useQueryClient();

  // Load Puter.js
  useEffect(() => {
    const loadPuter = async () => {
      try {
        // @ts-ignore
        await window.puter?.promise;
        setIsPuterLoaded(true);
      } catch (error) {
        console.error('Failed to load Puter.js:', error);
        setIsPuterLoaded(false);
      }
    };

    if (typeof window !== 'undefined' && !window.puter) {
      const script = document.createElement('script');
      script.src = 'https://js.puter.com/v2/';
      script.async = true;
      document.body.appendChild(script);
      script.onload = loadPuter;
    } else {
      loadPuter();
    }
  }, []);

  // Fetch expired items
  const { data: expiredItems = [], isLoading } = useQuery<ExpiredItem[]>({
    queryKey: ['expiredItems', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('inventory')
        .select('*')
        .lte('expiry_date', format(new Date(), 'yyyy-MM-dd'))
        .order('expiry_date', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('expiry_date', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        query = query.lte('expiry_date', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  });

  // Get all expired items for analysis
  const { data: allExpiredItems = [] } = useQuery<ExpiredItem[]>({
    queryKey: ['allExpiredItems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .lte('expiry_date', format(new Date(), 'yyyy-MM-dd'))
        .order('expiry_date', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expiredItems'] });
      queryClient.invalidateQueries({ queryKey: ['allExpiredItems'] });
      toast.success('Item deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error deleting item: ${error.message}`);
    },
  });

  // Filter items based on search term
  const filteredItems = expiredItems.filter(item =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate total loss
  const totalLoss = filteredItems.reduce(
    (sum, item) => sum + item.quantity * item.cost_per_unit,
    0
  );

  // Handle time range changes
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    const today = new Date();

    switch (range) {
      case 'today':
        setDateRange({
          from: startOfDay(today),
          to: endOfDay(today),
        });
        break;
      case 'this week':
        setDateRange({
          from: startOfWeek(today),
          to: endOfWeek(today),
        });
        break;
      case 'this month':
        setDateRange({
          from: startOfMonth(today),
          to: endOfMonth(today),
        });
        break;
      case 'custom':
        // Custom range is handled by the date picker
        break;
      default:
        setDateRange(undefined);
    }
  };

  // Handle analysis
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      if (!isPuterLoaded) {
        throw new Error('AI service is still loading. Please try again in a moment.');
      }

      if (allExpiredItems.length === 0) {
        throw new Error('No expired items to analyze');
      }

      const prompt = `Analyze these expired stock items:
      - Total items: ${allExpiredItems.length}
      - Time range: ${timeRange}
      - Sample items: ${JSON.stringify(allExpiredItems.slice(0, 3))}
      
      Provide a detailed analysis with:
      1. Summary of patterns and trends
      2. Top 3 problematic products with reasons
      3. Specific recommendations to reduce waste
      4. Any seasonal trends detected
      5. Cost-saving opportunities
      
      Format the response with clear sections using markdown-style headers (##) and bullet points.`;

      const response = await window.puter.ai.chat(prompt, { 
        model: selectedModel
      });

      setAnalysisReport(response);
      toast.success('Analysis completed successfully');
    } catch (error) {
      console.error('Analysis error:', error);
      const err = error instanceof Error ? error : new Error('Analysis failed');
      setAnalysisError(err);
      toast.error(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Print the analysis report
  const printAnalysisReport = () => {
    const printContent = `
      <html>
        <head>
          <title>AI Analysis Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            h2 { color: #444; margin-top: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .summary { margin-bottom: 30px; }
            .analysis-content { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AI Analysis Report</h1>
            <p>Generated on ${format(new Date(), 'PPPPpppp')}</p>
          </div>
          
          <div class="summary">
            <p><strong>Total Items Analyzed:</strong> ${allExpiredItems.length}</p>
            <p><strong>Time Range:</strong> ${timeRange}</p>
          </div>
          
          <div class="analysis-content">
            ${analysisReport.replace(/\n/g, '<br>')}
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <Card>
        <CardHeader>
          <CardTitle>Expired Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select onValueChange={handleTimeRangeChange} value={timeRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this week">This Week</SelectItem>
                  <SelectItem value="this month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              {timeRange === 'custom' && (
                <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">
                    Total Loss: ${totalLoss.toFixed(2)} ({filteredItems.length} items)
                  </span>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Loss</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.product_name}
                          </TableCell>
                          <TableCell>{item.batch_number}</TableCell>
                          <TableCell>
                            {format(parseISO(item.expiry_date), 'PP')}
                          </TableCell>
                          <TableCell>
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell>{item.supplier_name || '-'}</TableCell>
                          <TableCell>
                            ${(item.quantity * item.cost_per_unit).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(item.id)}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-500" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No expired items found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>AI Production Analysis (Free)</CardTitle>
            {analysisReport && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={printAnalysisReport}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Report
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isPuterLoaded ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading AI service...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-green-50 p-2 rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-700">AI Service Ready</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">AI Model</label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI Model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                        <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="o3-mini">O3 Mini</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Get free AI-powered insights about expired product patterns using Puter.js.
                </p>

                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || allExpiredItems.length === 0}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzing...</span>
                    </div>
                  ) : (
                    'Run Free Analysis'
                  )}
                </Button>

                {analysisError && (
                  <div className="p-3 bg-red-50 rounded-md border border-red-200">
                    <p className="text-red-600">{analysisError.message}</p>
                  </div>
                )}

                {analysisReport && (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">Analysis Results</h4>
                      <div className="whitespace-pre-wrap text-sm">
                        {analysisReport.split('\n').map((line, i) => (
                          <p key={i} className="mb-2">
                            {line.startsWith('##') ? (
                              <strong className="text-lg block mt-4">{line.replace('##', '')}</strong>
                            ) : (
                              line
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default ExpiredStockPage;
