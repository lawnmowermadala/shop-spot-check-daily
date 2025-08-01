
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Brain, FileText } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';

interface DailyProduction {
  date: string;
  total_production: number;
}

interface StaffProductionStats {
  staff_name: string;
  total_batches: number;
  total_units: number;
}

interface ProductionBatch {
  id: string;
  product_name: string;
  quantity_produced: number;
  production_date: string;
  staff_name: string;
  total_ingredient_cost?: number;
  cost_per_unit?: number;
}

interface AIProductionAnalyticsProps {
  historicalProduction: DailyProduction[];
  staffStats: StaffProductionStats[];
  productionBatches: ProductionBatch[];
  comparisonDays: number;
}

declare global {
  interface Window {
    puter: {
      ai: {
        chat: (
          prompt: string | Array<any>, 
          options?: {
            model?: string;
            stream?: boolean;
            max_tokens?: number;
            temperature?: number;
          }
        ) => Promise<any>;
      };
    };
  }
}

const AIProductionAnalytics = ({ 
  historicalProduction, 
  staffStats, 
  productionBatches, 
  comparisonDays 
}: AIProductionAnalyticsProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const prepareProductionDataForAI = () => {
    const dataContext = {
      historical_production: historicalProduction,
      staff_statistics: staffStats,
      recent_batches: productionBatches.slice(0, 20),
      analysis_period: `${comparisonDays} days`,
      total_production: historicalProduction.reduce((sum, day) => sum + day.total_production, 0),
      average_daily_production: historicalProduction.length > 0 
        ? (historicalProduction.reduce((sum, day) => sum + day.total_production, 0) / historicalProduction.length).toFixed(2)
        : 0
    };

    return JSON.stringify(dataContext, null, 2);
  };

  const analyzeWithAI = async (specificPrompt?: string) => {
    if (!window.puter) {
      toast.error('Puter AI is not available. Please ensure you have the Puter script loaded.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis('');

    try {
      const productionData = prepareProductionDataForAI();
      
      const defaultPrompt = `
        As a production analytics expert, analyze the following bakery/kitchen production data and provide:
        
        1. **Daily Production Analysis**: 
           - Calculate daily averages, trends, and patterns
           - Identify peak production days and low production days
           - Daily efficiency metrics
        
        2. **Weekly Production Proposal**:
           - Day-by-day production recommendations for next week
           - Consider historical patterns and staff capacity
           - Include specific quantities per day
        
        3. **Staff Performance Analysis**:
           - Individual staff productivity metrics
           - Recommendations for staff optimization
           - Daily staff allocation suggestions
        
        4. **Financial Analysis**:
           - Calculate actual sale values (use selling price when available, otherwise apply 40% markup on cost)
           - Daily revenue projections
           - Cost vs revenue analysis per day
           - Identify potential losses from expired stock
        
        5. **Executive Summary**:
           - Key insights and recommendations
           - Action items for management
           - Daily operational improvements
        
        Production Data:
        ${productionData}
        
        Please provide specific, actionable insights with daily breakdowns where requested.
      `;

      const prompt = specificPrompt || defaultPrompt;

      const completion = await window.puter.ai.chat(prompt, {
        model: 'claude-sonnet-4',
        stream: true,
        max_tokens: 4000,
        temperature: 0.3
      });

      let fullResponse = '';
      
      for await (const part of completion) {
        if (part?.text) {
          fullResponse += part.text;
          setAnalysis(fullResponse);
        }
      }

      toast.success('AI analysis completed successfully!');
    } catch (error) {
      console.error('AI Analysis Error:', error);
      toast.error('Failed to analyze production data: ' + (error as Error).message);
      setAnalysis('Failed to generate analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCustomAnalysis = async () => {
    if (!customPrompt.trim()) {
      toast.error('Please enter a custom prompt for analysis.');
      return;
    }

    const productionData = prepareProductionDataForAI();
    const fullPrompt = `
      ${customPrompt}
      
      Here is the production data to analyze:
      ${productionData}
    `;

    await analyzeWithAI(fullPrompt);
  };

  const handlePrintPDF = () => {
    if (!analysis.trim()) {
      toast.error('Please generate an AI analysis first before printing.');
      return;
    }

    const printContent = `
      <html>
        <head>
          <title>AI Production Analytics Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              line-height: 1.6;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #4f46e5;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #4f46e5;
              margin-bottom: 10px;
            }
            .header .subtitle {
              color: #666;
              font-size: 14px;
            }
            .analysis-content {
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              margin-bottom: 20px;
            }
            .analysis-content h1, .analysis-content h2, .analysis-content h3 {
              color: #4f46e5;
              margin-top: 20px;
              margin-bottom: 10px;
            }
            .analysis-content h1 { font-size: 1.5rem; }
            .analysis-content h2 { font-size: 1.25rem; }
            .analysis-content h3 { font-size: 1.125rem; }
            .analysis-content p {
              margin-bottom: 10px;
            }
            .analysis-content ul, .analysis-content ol {
              margin-left: 20px;
              margin-bottom: 15px;
            }
            .analysis-content li {
              margin-bottom: 5px;
            }
            .data-summary {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              border-left: 4px solid #4f46e5;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 12px;
            }
            .powered-by {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 5px;
              margin-top: 10px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🤖 AI Production Analytics Report</h1>
            <div class="subtitle">
              Generated on ${format(new Date(), 'PPPp')}<br>
              Analysis Period: ${comparisonDays} days
            </div>
          </div>
          
          <div class="data-summary">
            <h3>📊 Data Summary</h3>
            <p><strong>Total Production Items:</strong> ${historicalProduction.reduce((sum, day) => sum + day.total_production, 0)}</p>
            <p><strong>Production Days Analyzed:</strong> ${historicalProduction.length}</p>
            <p><strong>Staff Members:</strong> ${staffStats.length}</p>
            <p><strong>Recent Batches:</strong> ${productionBatches.length}</p>
          </div>
          
          <div class="analysis-content">
            ${analysis.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
          </div>
          
          <div class="footer">
            <p>This report was generated using AI-powered analytics to provide insights into production data.</p>
            <div class="powered-by">
              <span>🧠 Powered by Claude-Sonnet-4 via Puter AI</span>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load before printing
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
      toast.success('PDF report opened for printing!');
    } else {
      toast.error('Unable to open print window. Please check popup blockers.');
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-500" />
          AI Production Analytics (Claude-Sonnet-4)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={() => analyzeWithAI()} 
            disabled={isAnalyzing}
            className="flex-1"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Production Data...
              </>
            ) : (
              'Generate Complete Analysis'
            )}
          </Button>
          
          {analysis && (
            <Button 
              onClick={handlePrintPDF}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Custom Analysis Prompt:</label>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Enter your specific questions about production data (e.g., 'Focus on staff efficiency and recommend daily production targets for next week')"
            rows={3}
          />
          <Button 
            onClick={handleCustomAnalysis}
            disabled={isAnalyzing || !customPrompt.trim()}
            variant="outline"
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Custom Analysis...
              </>
            ) : (
              'Run Custom Analysis'
            )}
          </Button>
        </div>

        {analysis && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">AI Analysis Results:</h3>
              <Button 
                onClick={handlePrintPDF}
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-800"
              >
                <FileText className="w-4 h-4 mr-1" />
                PDF
              </Button>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {analysis}
              </div>
            </div>
          </div>
        )}

        {!analysis && !isAnalyzing && (
          <div className="text-center py-8 text-gray-500">
            <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Click "Generate Complete Analysis" to get AI insights on your production data</p>
            <p className="text-xs mt-1">Powered by Claude-Sonnet-4 via Puter AI</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIProductionAnalytics;
