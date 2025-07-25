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

// ... (keep all your existing interfaces)

const ExpiredStockPage = () => {
  // ... (keep all your existing state and queries)

  // Add this state for the analysis report
  const [analysisReport, setAnalysisReport] = useState<string>('');

  // Update your analyzeExpiredItems function
  const analyzeExpiredItems = async () => {
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

      // Store the full report for display and printing
      setAnalysisReport(response);

      return {
        success: true,
        data: {
          analysis: response,
          totalItems: allExpiredItems.length,
          timeRange: timeRange
        },
        message: 'Analysis completed successfully'
      };
    } catch (error) {
      console.error('Analysis error:', error);
      throw error instanceof Error ? error : new Error('Analysis failed');
    }
  };

  // Add this function to print the analysis report
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
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.focus();
    setTimeout(() => {
      printWindow?.print();
    }, 500);
  };

  // Update your AI Analysis section in the JSX
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      {/* ... (keep all your existing JSX) */}

      {/* Updated AI Analysis Section */}
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
                  onClick={() => handleAnalyze()}
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
                      <div className="whitespace-pre-wrap prose max-w-none">
                        {analysisReport}
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
