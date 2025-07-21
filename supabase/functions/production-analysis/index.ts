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
        batch_date
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
      batch_date: item.batch_date
    })) || [];

    // Prepare data for AI analysis
    const analysisPrompt = `
Analyze this production and expired stock data to provide actionable insights for production optimization:

PRODUCTION DATA:
${JSON.stringify(transformedProduction, null, 2)}

EXPIRED STOCK DATA:
${JSON.stringify(transformedExpired, null, 2)}

DATE RANGE: ${dateRange.from} to ${dateRange.to}

Please provide a comprehensive analysis including:

1. **OVERPRODUCTION ANALYSIS**: Which products are being produced in excess (high expired quantities relative to production)?

2. **DAY-OF-WEEK PATTERNS**: 
   - Which days of the week show highest production vs expired ratios?
   - Are there specific days when certain products expire more?
   - Recommended production schedule adjustments by day

3. **PRODUCT-SPECIFIC RECOMMENDATIONS**:
   - Products to reduce production for
   - Products to increase production for
   - Optimal production quantities by product

4. **SALE VALUE IMPACT ANALYSIS**:
   - Calculate estimated sale value of production (assume 40% markup on production cost)
   - Total financial loss from expired products in sale value terms (in South African Rand - ZAR)
   - Lost revenue potential from expired stock
   - Cost savings and revenue recovery potential from optimization
   - ROI projections for recommended changes

5. **WEEKLY PRODUCTION PROPOSAL**:
   - Day-by-day production recommendations for the upcoming week
   - Monday through Sunday specific production quantities by product
   - Rationale for each day's production plan
   - Expected sale values for each day's production

6. **TIME-OF-MONTH PATTERNS**: Any monthly trends affecting production efficiency

7. **STAFF PERFORMANCE**: Which staff members have better production efficiency ratios

8. **ACTIONABLE RECOMMENDATIONS**: Specific, measurable steps to reduce waste and optimize production

Format the response as a professional report that can be printed and used for production meetings. Include specific numbers, percentages, and clear action items. All currency amounts should be referenced in South African Rand (ZAR). Focus on sale value impact rather than just production costs.
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