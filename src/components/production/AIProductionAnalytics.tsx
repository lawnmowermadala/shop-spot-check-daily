
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Brain } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

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
            <h3 className="text-lg font-semibold mb-3">AI Analysis Results:</h3>
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
