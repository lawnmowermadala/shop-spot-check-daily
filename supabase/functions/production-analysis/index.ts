import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductionData {
  date: string;
  day_of_week: string;
  product_name: string;
  quantity_produced: number;
  total_cost: number;
}

interface ExpiredData {
  product_name: string;
  quantity: string;
  total_cost_loss: number;
  removal_date: string;
  day_of_week: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dateRange } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    
    if (!openRouterKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get production data with day of week
    const { data: productionData, error: prodError } = await supabase
      .from('production_batches')
      .select(`
        production_date,
        quantity_produced,
        total_ingredient_cost,
        products!inner(name),
        staff_name
      `)
      .gte('production_date', dateRange.from)
      .lte('production_date', dateRange.to);

    if (prodError) throw prodError;

    // Get expired stock data with day of week
    const { data: expiredData, error: expError } = await supabase
      .from('expired_items')
      .select(`
        product_name,
        quantity,
        total_cost_loss,
        removal_date,
        batch_date,
        selling_price
      `)
      .gte('removal_date', dateRange.from)
      .lte('removal_date', dateRange.to);

    if (expError) throw expError;

    // Transform data for analysis
    const transformedProduction = productionData?.map(item => ({
      date: item.production_date,
      day_of_week: new Date(item.production_date).toLocaleDateString('en-US', { weekday: 'long' }),
      product_name: item.products?.name || 'Unknown',
      quantity_produced: item.quantity_produced,
      total_cost: item.total_ingredient_cost,
      staff_name: item.staff_name
    })) || [];

    const transformedExpired = expiredData?.map(item => ({
      product_name: item.product_name,
      quantity: item.quantity,
      total_cost_loss: item.total_cost_loss,
      removal_date: item.removal_date,
      day_of_week: new Date(item.removal_date).toLocaleDateString('en-US', { weekday: 'long' }),
      batch_date: item.batch_date,
      selling_price: item.selling_price
    })) || [];

    // Create selling price lookup from expired items
    const sellingPriceLookup = transformedExpired.reduce((acc, item) => {
      if (item.selling_price && !acc[item.product_name]) {
        acc[item.product_name] = item.selling_price;
      }
      return acc;
    }, {});

    // Calculate daily breakdowns for better analysis
    const dailyProductionBreakdown = transformedProduction.reduce((acc, item) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = { totalCost: 0, totalQuantity: 0, products: {}, saleValue: 0 };
      }
      acc[date].totalCost += item.total_cost || 0;
      acc[date].totalQuantity += item.quantity_produced || 0;
      
      // Use actual selling price if available, otherwise fallback to 40% markup
      const sellingPrice = sellingPriceLookup[item.product_name];
      const saleValue = sellingPrice 
        ? (item.quantity_produced || 0) * sellingPrice
        : (item.total_cost || 0) * 1.4;
      acc[date].saleValue += saleValue;
      
      if (!acc[date].products[item.product_name]) {
        acc[date].products[item.product_name] = { cost: 0, quantity: 0, saleValue: 0 };
      }
      acc[date].products[item.product_name].cost += item.total_cost || 0;
      acc[date].products[item.product_name].quantity += item.quantity_produced || 0;
      acc[date].products[item.product_name].saleValue += saleValue;
      
      return acc;
    }, {});

    const dailyExpiredBreakdown = transformedExpired.reduce((acc, item) => {
      const date = item.removal_date;
      if (!acc[date]) {
        acc[date] = { totalLoss: 0, totalQuantity: 0, products: {}, saleValueLoss: 0 };
      }
      acc[date].totalLoss += item.total_cost_loss || 0;
      acc[date].totalQuantity += parseFloat(item.quantity || '0');
      acc[date].saleValueLoss += (item.total_cost_loss || 0) * 1.4; // Sale value loss
      
      if (!acc[date].products[item.product_name]) {
        acc[date].products[item.product_name] = { loss: 0, quantity: 0, saleValueLoss: 0 };
      }
      acc[date].products[item.product_name].loss += item.total_cost_loss || 0;
      acc[date].products[item.product_name].quantity += parseFloat(item.quantity || '0');
      acc[date].products[item.product_name].saleValueLoss += (item.total_cost_loss || 0) * 1.4;
      
      return acc;
    }, {});

    // Prepare data for AI analysis
    const analysisPrompt = `
Analyze this production and expired stock data to provide actionable insights for production optimization:

DAILY PRODUCTION BREAKDOWN:
${JSON.stringify(dailyProductionBreakdown, null, 2)}

DAILY EXPIRED STOCK BREAKDOWN:
${JSON.stringify(dailyExpiredBreakdown, null, 2)}

PRODUCTION DATA DETAILS:
${JSON.stringify(transformedProduction, null, 2)}

EXPIRED STOCK DATA DETAILS:
${JSON.stringify(transformedExpired, null, 2)}

DATE RANGE: ${dateRange.from} to ${dateRange.to}

Please provide a comprehensive DAILY-FOCUSED analysis including:

1. **DAILY OVERPRODUCTION ANALYSIS**: 
   - Day-by-day breakdown of which products are being produced in excess
   - Daily expired quantities relative to daily production
   - Identify worst performing days

2. **DAY-OF-WEEK PATTERNS**: 
   - Daily production vs expired ratios for each day
   - Specific days when certain products expire more
   - Daily recommended production schedule adjustments

3. **DAILY PRODUCT-SPECIFIC RECOMMENDATIONS**:
   - Daily optimal production quantities by product
   - Products to reduce/increase production for on specific days
   - Day-specific production targets

4. **DAILY SALE VALUE IMPACT ANALYSIS**:
   - Day-by-day estimated sale value of production (40% markup on production cost)
   - Daily financial loss from expired products in sale value terms (ZAR)
   - Daily lost revenue potential from expired stock
   - Daily cost savings and revenue recovery potential

5. **WEEKLY PRODUCTION PROPOSAL WITH DAILY BREAKDOWN**:
   - Monday through Sunday specific production quantities by product
   - Daily expected sale values for each day's production plan
   - Daily rationale for each day's production recommendations
   - Daily target reductions to minimize waste

6. **DAILY PERFORMANCE METRICS**:
   - Daily efficiency ratios
   - Daily waste percentages
   - Daily sale value targets vs losses

7. **DAILY ACTIONABLE RECOMMENDATIONS**: 
   - Specific daily production adjustments
   - Daily monitoring targets
   - Day-specific operational changes

IMPORTANT: All calculations, recommendations, and metrics must be presented on a DAILY basis, not aggregated. Show daily figures, daily targets, daily losses, and daily improvements. All currency amounts in South African Rand (ZAR).

Format as a professional daily operations report for production meetings.
`;

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a production optimization analyst with expertise in food manufacturing, inventory management, and waste reduction. Provide detailed, actionable insights based on production and expired stock data.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices[0].message.content;

    // Calculate summary statistics
    const totalProduction = transformedProduction.reduce((sum, item) => sum + (item.quantity_produced || 0), 0);
    const totalProductionCost = transformedProduction.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    const totalExpiredLoss = transformedExpired.reduce((sum, item) => sum + (item.total_cost_loss || 0), 0);
    const wastePercentage = totalProductionCost > 0 ? ((totalExpiredLoss / totalProductionCost) * 100).toFixed(2) : '0';

    return new Response(JSON.stringify({
      analysis,
      summary: {
        totalProduction,
        totalProductionCost,
        totalExpiredLoss,
        wastePercentage,
        analysisDate: new Date().toISOString(),
        dateRange
      },
      rawData: {
        production: transformedProduction,
        expired: transformedExpired
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in production-analysis function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});