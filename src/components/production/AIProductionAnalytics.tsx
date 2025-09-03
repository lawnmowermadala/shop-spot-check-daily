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
  dispatchRecords?: any[];
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
  dispatchRecords = [],
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
      dispatch_records: dispatchRecords.slice(0, 20),
      dispatch_summary: {
        total_dispatched: dispatchRecords.reduce((sum, dispatch) => sum + (dispatch.quantity_dispatched || 0), 0),
        dispatch_destinations: dispatchRecords.reduce((acc, dispatch) => {
          acc[dispatch.dispatch_destination] = (acc[dispatch.dispatch_destination] || 0) + dispatch.quantity_dispatched;
          return acc;
        }, {} as Record<string, number>),
        recent_dispatches: dispatchRecords.slice(0, 10)
      },
      analysis_period: `${comparisonDays} days`,
      total_production: historicalProduction.reduce((sum, day) => sum + day.total_production, 0),
      average_daily_production: historicalProduction.length > 0 
        ? (historicalProduction.reduce((sum, day) => sum + day.total_production, 0) / historicalProduction.length).toFixed(2)
        : 0,
      currency: 'ZAR (South African Rand)'
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
        As an expert production analytics consultant for a South African bakery business, analyze the following expired stock/production data and dispatch records, and provide a comprehensive report with all costs in South African Rand (ZAR):
        
        1. **HIGH & LOW EXPIRY ANALYSIS**:
           - Identify the TOP 5 products with HIGHEST expiry/waste rates (name each product specifically)
           - Identify the TOP 5 products with LOWEST expiry/waste rates (name each product specifically)
           - Calculate exact percentages and quantities for each product
           - Analyze why these products have high/low expiry rates
        
        2. **DISPATCH EFFECTIVENESS ANALYSIS**:
           - Analyze dispatch destinations and their effectiveness
           - Identify which destinations receive the most expired stock
           - Calculate recovery rates from dispatched items
           - Recommend optimal dispatch strategies and timing
           - Suggest new dispatch channels to minimize waste
        
        3. **SPECIFIC PRODUCT RECOMMENDATIONS**:
           For HIGH expiry products:
           - Reduce production quantities by specific amounts
           - Suggest optimal production schedules
           - Recommend shelf-life improvement strategies
           - Identify best dispatch destinations for these products
           
           For LOW expiry products:
           - Consider increasing production if demand allows
           - Use as benchmark for other products
           - Analyze what makes them successful
        
        4. **DAILY PRODUCTION FORECAST WITH DISPATCH PLANNING**:
           - Monday to Sunday production recommendations
           - Specific quantities per product per day
           - Dispatch schedule recommendations
           - Seasonal adjustments based on expiry and dispatch patterns
        
        5. **WASTE REDUCTION & DISPATCH OPTIMIZATION STRATEGIES**:
           - Immediate actions to reduce high-expiry products
           - Long-term production optimization
           - Staff training recommendations for dispatch management
           - Inventory management improvements
           - Dispatch timing optimization
        
        6. **FINANCIAL IMPACT ANALYSIS** (All amounts in ZAR):
           - Calculate total waste cost for high-expiry products
           - Value recovery from dispatch operations
           - Potential savings from implementing recommendations
           - ROI projections for waste reduction and dispatch optimization initiatives
        
        7. **EXECUTIVE SUMMARY WITH ACTION ITEMS**:
           - Top 3 critical actions to take immediately
           - 30-day implementation plan for dispatch optimization
           - Expected results and KPIs to track (including dispatch metrics)
        
        Production Data & Dispatch Records:
        ${productionData}
        
        Please provide specific product names, exact quantities in ZAR, dispatch destination analysis, and actionable recommendations with measurable outcomes for this South African bakery business.
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
      Please analyze the following South African bakery production data and answer these specific questions (all financial amounts should be in South African Rand - ZAR):
      
      ${selectedQuestionTexts}
      
      Production Data:
      ${productionData}
      
      Please provide detailed, data-driven answers to each selected question with specific recommendations and insights for this South African bakery business.
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
      
      Here is the South African bakery production data to analyze (all financial amounts should be in South African Rand - ZAR):
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
          <title>Elton Niati Production Analytics & Expiry Analysis Report</title>
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
            
            .highlight-section {
              background: #fef3c7;
              padding: 12px;
              border-radius: 5px;
              margin: 10px 0;
              border-left: 4px solid #f59e0b;
            }
            
            .high-expiry {
              background: #fee2e2;
              border-left-color: #dc2626;
            }
            
            .low-expiry {
              background: #dcfce7;
              border-left-color: #16a34a;
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
            
            .currency-note {
              background: #e6f3ff;
              padding: 10px;
              border-radius: 5px;
              margin: 10px 0;
              border-left: 4px solid #0066cc;
              font-size: 12px;
            }
            
            @media print {
              body { 
                margin: 0; 
                padding: 10px;
                font-size: 12px;
              }
              
              .header, .analysis-content, .data-summary, .highlight-section, .footer {
                break-inside: avoid-page;
                box-shadow: none;
                border: 1px solid #ddd;
              }
              
              .no-print { 
                display: none; 
              }
              
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
            <h1>🤖 Production Analytics & Expiry Analysis Report</h1>
            <div class="subtitle">
              Generated on ${format(new Date(), 'PPPp')}<br>
              Analysis Period: ${comparisonDays} days | Currency: South African Rand (ZAR)
            </div>
          </div>
          
          <div class="currency-note">
            <strong>💰 Currency Note:</strong> All financial amounts in this report are displayed in South African Rand (ZAR).
          </div>
          
          <div class="data-summary">
            <h3>📊 Production & Expiry Data Summary</h3>
            <p><strong>Total Production Items:</strong> ${historicalProduction.reduce((sum, day) => sum + day.total_production, 0)}</p>
            <p><strong>Production Days Analyzed:</strong> ${historicalProduction.length}</p>
            <p><strong>Staff Members:</strong> ${staffStats.length}</p>
            <p><strong>Expired/Waste Batches:</strong> ${productionBatches.length}</p>
            <p><strong>Analysis Focus:</strong> High & Low Expiry Products with Future Production Recommendations</p>
            <p><strong>Business Location:</strong> South Africa</p>
          </div>
          
          <div class="analysis-content">
            ${analysis.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/ZAR/gi, '<span style="color: #0066cc; font-weight: bold;">ZAR</span>')
              .replace(/(HIGH EXPIRY|HIGHEST|TOP.*HIGH)/gi, '<span style="color: #dc2626; font-weight: bold;">$1</span>')
              .replace(/(LOW EXPIRY|LOWEST|TOP.*LOW)/gi, '<span style="color: #16a34a; font-weight: bold;">$1</span>')}
          </div>
          
          <div class="footer">
            <p>This comprehensive expiry analysis report provides actionable insights to reduce waste and optimize production scheduling for South African bakery operations.</p>
            <div class="powered-by">
              <span class="ai-brand">🧠 Powered by Elton Niati AI Agent</span>
            </div>
            <p style="margin-top: 8px; font-size: 10px;">
              Report includes high/low expiry analysis, specific product recommendations, and future production planning in ZAR
            </p>
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
      
      toast.success('Comprehensive expiry analysis report opened for printing! Optimized for all devices.');
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
          Elton Niati AI Production Analytics & Expiry Analysis
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
                Analyzing High & Low Expiry Products...
              </>
            ) : (
              'Generate Complete Expiry Analysis'
            )}
          </Button>
          
          {analysis && (
            <Button 
              onClick={handlePrintPDF}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export Analysis PDF
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
              <h3 className="text-lg font-semibold">AI Expiry Analysis Results:</h3>
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
            <p>Generate AI analysis to get detailed insights on high & low expiry products</p>
            <p className="text-xs mt-1">Includes specific product recommendations and future production planning</p>
            <p className="text-xs mt-1">Powered by Elton Niati AI Agent</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIProductionAnalytics;
