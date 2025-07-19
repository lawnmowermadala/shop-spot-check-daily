import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Loader2, FileText, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { format, subDays } from 'date-fns';

interface AnalysisResult {
  analysis: string;
  summary: {
    totalProduction: number;
    totalProductionCost: number;
    totalExpiredLoss: number;
    wastePercentage: string;
    analysisDate: string;
    dateRange: DateRange;
  };
  rawData: {
    production: any[];
    expired: any[];
  };
}

const ProductionAnalysisReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const generateAnalysis = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Error",
        description: "Please select a date range for analysis",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('production-analysis', {
        body: {
          dateRange: {
            from: format(dateRange.from, 'yyyy-MM-dd'),
            to: format(dateRange.to, 'yyyy-MM-dd')
          }
        }
      });

      if (error) throw error;

      setAnalysisResult(data);
      toast({
        title: "Analysis Complete",
        description: "Production optimization report generated successfully",
      });
    } catch (error) {
      console.error('Error generating analysis:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate analysis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const printReport = () => {
    if (!analysisResult) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Production Optimization Analysis Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .summary-box {
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
          }
          .metric {
            display: inline-block;
            margin: 10px 15px;
            text-align: center;
          }
          .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #2563eb;
          }
          .metric-label {
            font-size: 0.9em;
            color: #666;
          }
          .analysis-content {
            white-space: pre-wrap;
            line-height: 1.8;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Production Optimization Analysis Report</h1>
          <p>Analysis Period: ${format(new Date(analysisResult.summary.dateRange.from), 'MMM dd, yyyy')} - ${format(new Date(analysisResult.summary.dateRange.to), 'MMM dd, yyyy')}</p>
          <p>Generated: ${format(new Date(analysisResult.summary.analysisDate), 'MMM dd, yyyy - HH:mm')}</p>
        </div>
        
        <div class="summary-box">
          <h2>Executive Summary</h2>
          <div class="metric">
            <div class="metric-value">${analysisResult.summary.totalProduction.toFixed(0)}</div>
            <div class="metric-label">Total Units Produced</div>
          </div>
           <div class="metric">
             <div class="metric-value">R${analysisResult.summary.totalProductionCost.toFixed(2)}</div>
             <div class="metric-label">Total Production Cost</div>
           </div>
           <div class="metric">
             <div class="metric-value">R${analysisResult.summary.totalExpiredLoss.toFixed(2)}</div>
             <div class="metric-label">Expired Stock Loss</div>
           </div>
          <div class="metric">
            <div class="metric-value">${analysisResult.summary.wastePercentage}%</div>
            <div class="metric-label">Waste Percentage</div>
          </div>
        </div>
        
        <div class="analysis-content">
          ${analysisResult.analysis.replace(/\n/g, '<br>')}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          AI Production Optimization Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            className="w-auto"
          />
          <Button 
            onClick={generateAnalysis} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
            Generate Analysis
          </Button>
          {analysisResult && (
            <Button 
              onClick={printReport} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Print Report
            </Button>
          )}
        </div>

        {analysisResult && (
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Summary Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {analysisResult.summary.totalProduction.toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Units Produced</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      R{analysisResult.summary.totalProductionCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Production Cost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      R{analysisResult.summary.totalExpiredLoss.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Expired Loss</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {analysisResult.summary.wastePercentage}%
                    </div>
                    <div className="text-sm text-muted-foreground">Waste Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  AI Analysis & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {analysisResult.analysis}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductionAnalysisReport;