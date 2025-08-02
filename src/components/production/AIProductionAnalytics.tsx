
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Brain, FileText, HelpCircle } from 'lucide-react';
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

const PREDEFINED_QUESTIONS = [
  {
    id: 'expiry_frequency',
    category: 'Product Expiry Analysis',
    question: 'Which products expire most frequently after a certain number of days?'
  },
  {
    id: 'expiry_days',
    category: 'Product Expiry Analysis',
    question: 'On which days of the week do products tend to expire the most?'
  },
  {
    id: 'average_expiry',
    category: 'Product Expiry Analysis',
    question: 'What is the average expiration period for different bakery and takeaway items?'
  },
  {
    id: 'waste_expiry',
    category: 'Product Expiry Analysis',
    question: 'Which products have the highest waste due to expiration?'
  },
  {
    id: 'overproduction',
    category: 'Sales vs. Production Analysis',
    question: 'Which products are produced in quantities exceeding actual sales?'
  },
  {
    id: 'overproduction_days',
    category: 'Sales vs. Production Analysis',
    question: 'Are there specific days when overproduction occurs?'
  },
  {
    id: 'production_vs_sales',
    category: 'Sales vs. Production Analysis',
    question: 'How does production volume compare to sales volume across different days?'
  },
  {
    id: 'waste_products',
    category: 'Waste and Expiry Patterns',
    question: 'What products are most often wasted due to expiration?'
  },
  {
    id: 'waste_patterns',
    category: 'Waste and Expiry Patterns',
    question: 'Is there a pattern in waste generation based on product type or day of the week?'
  },
  {
    id: 'waste_volume',
    category: 'Waste and Expiry Patterns',
    question: 'How much waste is generated weekly/monthly from expired products?'
  },
  {
    id: 'production_recommendations',
    category: 'Optimization & Future Planning',
    question: 'Based on past data, what should be the recommended production quantities for Monday, Tuesday, etc.?'
  },
  {
    id: 'scaling_recommendations',
    category: 'Optimization & Future Planning',
    question: 'Which products should be scaled back or increased to minimize waste?'
  },
  {
    id: 'waste_strategies',
    category: 'Optimization & Future Planning',
    question: 'What strategies can be implemented to reduce expired product waste?'
  },
  {
    id: 'inventory_improvement',
    category: 'Optimization & Future Planning',
    question: 'How can inventory management be improved to prevent overproduction?'
  },
  {
    id: 'discount_timing',
    category: 'Operational Recommendations',
    question: 'When is the optimal time to discount or sell near-expiry products?'
  },
  {
    id: 'demand_forecasting',
    category: 'Operational Recommendations',
    question: 'How can demand forecasting improve to reduce waste?'
  },
  {
    id: 'schedule_adjustments',
    category: 'Operational Recommendations',
    question: 'What adjustments can be made to production schedules to align better with sales trends?'
  }
];

const AIProductionAnalytics = ({ 
  historicalProduction, 
  staffStats, 
  productionBatches, 
  comparisonDays 
}: AIProductionAnalyticsProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

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

  const handleSelectedQuestionsAnalysis = async () => {
    if (selectedQuestions.length === 0) {
      toast.error('Please select at least one question to analyze.');
      return;
    }

    const selectedQuestionTexts = PREDEFINED_QUESTIONS
      .filter(q => selectedQuestions.includes(q.id))
      .map(q => `${q.category}: ${q.question}`)
      .join('\n');

    const productionData = prepareProductionDataForAI();
    const fullPrompt = `
      Please analyze the following production data and answer these specific questions:
      
      ${selectedQuestionTexts}
      
      Production Data:
      ${productionData}
      
      Please provide detailed, data-driven answers to each selected question with specific recommendations and insights.
    `;

    await analyzeWithAI(fullPrompt);
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

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const toggleAllInCategory = (category: string) => {
    const categoryQuestions = PREDEFINED_QUESTIONS
      .filter(q => q.category === category)
      .map(q => q.id);
    
    const allSelected = categoryQuestions.every(id => selectedQuestions.includes(id));
    
    if (allSelected) {
      setSelectedQuestions(prev => prev.filter(id => !categoryQuestions.includes(id)));
    } else {
      setSelectedQuestions(prev => [...new Set([...prev, ...categoryQuestions])]);
    }
  };

  const handlePrintPDF = () => {
    if (!analysis.trim()) {
      toast.error('Please generate an AI analysis first before printing.');
      return;
    }

    const printContent = `
      <html>
        <head>
          <title>Elton Niati AI Production Analytics Report</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              padding: 10px; 
              line-height: 1.6;
              color: #333;
              background: white;
              font-size: 14px;
            }
            
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              border-bottom: 2px solid #4f46e5;
              padding-bottom: 15px;
            }
            
            .header h1 {
              color: #4f46e5;
              margin-bottom: 8px;
              font-size: 1.5rem;
            }
            
            .header .subtitle {
              color: #666;
              font-size: 12px;
            }
            
            .analysis-content {
              background: white;
              padding: 15px;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              margin-bottom: 15px;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            
            .analysis-content h1, .analysis-content h2, .analysis-content h3 {
              color: #4f46e5;
              margin-top: 15px;
              margin-bottom: 8px;
            }
            
            .analysis-content h1 { font-size: 1.3rem; }
            .analysis-content h2 { font-size: 1.15rem; }
            .analysis-content h3 { font-size: 1.05rem; }
            
            .analysis-content p {
              margin-bottom: 8px;
            }
            
            .analysis-content ul, .analysis-content ol {
              margin-left: 15px;
              margin-bottom: 10px;
            }
            
            .analysis-content li {
              margin-bottom: 4px;
            }
            
            .data-summary {
              background: #f8f9fa;
              padding: 12px;
              border-radius: 5px;
              margin: 15px 0;
              border-left: 4px solid #4f46e5;
            }
            
            .data-summary h3 {
              margin-bottom: 8px;
            }
            
            .data-summary p {
              margin-bottom: 5px;
              font-size: 13px;
            }
            
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 11px;
            }
            
            .powered-by {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 5px;
              margin-top: 8px;
              flex-wrap: wrap;
            }
            
            .ai-brand {
              color: #4f46e5;
              font-weight: bold;
            }
            
            /* Mobile-specific styles */
            @media screen and (max-width: 768px) {
              body {
                padding: 8px;
                font-size: 13px;
              }
              
              .header h1 {
                font-size: 1.3rem;
              }
              
              .analysis-content {
                padding: 12px;
              }
              
              .data-summary {
                padding: 10px;
              }
            }
            
            /* Print styles for all devices */
            @media print {
              body { 
                margin: 0; 
                padding: 10px;
                font-size: 12px;
              }
              
              .header {
                break-inside: avoid;
              }
              
              .analysis-content {
                break-inside: avoid-page;
                box-shadow: none;
                border: 1px solid #ddd;
              }
              
              .data-summary {
                break-inside: avoid;
              }
              
              .footer {
                break-inside: avoid;
              }
              
              .no-print { 
                display: none; 
              }
              
              /* Ensure content doesn't get cut off */
              h1, h2, h3 {
                break-after: avoid;
              }
              
              p, li {
                break-inside: avoid;
              }
            }
            
            /* Mobile print adjustments */
            @media print and (max-width: 480px) {
              body {
                font-size: 11px;
              }
              
              .header h1 {
                font-size: 1.2rem;
              }
              
              .analysis-content h1 { font-size: 1.1rem; }
              .analysis-content h2 { font-size: 1.0rem; }
              .analysis-content h3 { font-size: 0.95rem; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🤖 Production Analytics Report</h1>
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
              <span class="ai-brand">🧠 Powered by Elton Niati AI Agent</span>
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
      
      toast.success('PDF report opened for printing! Mobile-optimized for all devices.');
    } else {
      toast.error('Unable to open print window. Please check popup blockers.');
    }
  };

  // Group questions by category
  const questionsByCategory = PREDEFINED_QUESTIONS.reduce((acc, question) => {
    if (!acc[question.category]) {
      acc[question.category] = [];
    }
    acc[question.category].push(question);
    return acc;
  }, {} as Record<string, typeof PREDEFINED_QUESTIONS>);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-500" />
          Elton Niati AI Production Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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

        {/* Predefined Questions Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Data Analysis & Waste Management Questions</h3>
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4">
            {Object.entries(questionsByCategory).map(([category, questions]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={questions.every(q => selectedQuestions.includes(q.id))}
                    onCheckedChange={() => toggleAllInCategory(category)}
                  />
                  <label 
                    htmlFor={`category-${category}`}
                    className="font-medium text-sm cursor-pointer"
                  >
                    {category} ({questions.filter(q => selectedQuestions.includes(q.id)).length}/{questions.length})
                  </label>
                </div>
                
                <div className="space-y-2 ml-6">
                  {questions.map((question) => (
                    <div key={question.id} className="flex items-start gap-2">
                      <Checkbox
                        id={question.id}
                        checked={selectedQuestions.includes(question.id)}
                        onCheckedChange={() => toggleQuestion(question.id)}
                      />
                      <label 
                        htmlFor={question.id}
                        className="text-sm cursor-pointer leading-tight"
                      >
                        {question.question}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button 
            onClick={handleSelectedQuestionsAnalysis}
            disabled={isAnalyzing || selectedQuestions.length === 0}
            className="w-full"
            variant="outline"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Selected Questions...
              </>
            ) : (
              `Analyze Selected Questions (${selectedQuestions.length})`
            )}
          </Button>
        </div>

        {/* Custom Analysis Section */}
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
            <p>Select specific questions above or click "Generate Complete Analysis" to get AI insights</p>
            <p className="text-xs mt-1">Powered by Elton Niati AI Agent</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIProductionAnalytics;
