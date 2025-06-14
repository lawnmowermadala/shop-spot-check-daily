
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import Navigation from '@/components/Navigation';
import RecipeEditModal from '@/components/RecipeEditModal';
import ProductionHeader from './production/ProductionHeader';
import ProductionAnalytics from './production/ProductionAnalytics';
import ProductionForm from './production/ProductionForm';
import ProductionBatchCard from './production/ProductionBatchCard';
import { useProductionData } from '@/hooks/useProductionData';
import { useIngredientMutations } from '@/hooks/useIngredientMutations';

const ProductionPage = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showStaffAnalytics, setShowStaffAnalytics] = useState(false);
  const [comparisonDays, setComparisonDays] = useState(7);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const {
    staffMembers,
    recipes,
    recipeIngredients,
    products,
    productionBatches,
    batchIngredients,
    historicalProduction,
    staffStats,
    deleteBatchMutation,
    updateBatchCostMutation,
    queryClient
  } = useProductionData(date, comparisonDays, activeBatchId, null);

  const {
    addIngredientMutation,
    deleteIngredientMutation,
    updateIngredientMutation
  } = useIngredientMutations(activeBatchId, updateBatchCostMutation.mutate);

  const calculateDailyProduction = () => {
    return productionBatches.reduce((total, batch) => total + batch.quantity_produced, 0);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Unable to open print window. Please check your browser settings.');
      return;
    }
    
    const dateText = format(date, 'MMMM dd, yyyy');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Production Report - ${dateText}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
            h3 { color: #666; margin: 20px 0 10px 0; }
            table { border-collapse: collapse; width: 100%; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .no-print { display: none; }
            @media print { .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1>Production Report</h1>
            <div class="no-print">
              <button onclick="window.print()">Print</button>
              <button onclick="window.close()">Close</button>
            </div>
          </div>
          
          <div class="summary">
            <strong>Report Date:</strong> ${dateText}<br>
            <strong>Total Batches:</strong> ${productionBatches.length}<br>
            <strong>Total Units Produced:</strong> ${calculateDailyProduction()}<br>
            <strong>Total Production Cost:</strong> R${productionBatches.reduce((sum, batch) => sum + (batch.total_ingredient_cost || 0), 0).toFixed(2)}<br>
            <strong>Generated:</strong> ${new Date().toLocaleString()}
          </div>
          
          <h3>Production Batches</h3>
          <table>
            <thead>
              <tr>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Staff Member</th>
                <th>Recipe</th>
                <th>Batch Cost</th>
                <th>Cost per Unit</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${productionBatches.map(batch => `
                <tr>
                  <td>${batch.product_code}</td>
                  <td>${batch.product_name}</td>
                  <td>${batch.quantity_produced}</td>
                  <td>${batch.staff_name}</td>
                  <td>${batch.recipe_name || 'No Recipe'}</td>
                  <td>R${(batch.total_ingredient_cost || 0).toFixed(2)}</td>
                  <td>R${(batch.cost_per_unit || 0).toFixed(2)}</td>
                  <td>${batch.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const handleBatchCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['production_batches'] });
    queryClient.invalidateQueries({ queryKey: ['staff_production_stats'] });
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <ProductionHeader
        date={date}
        setDate={setDate}
        batchCount={productionBatches.length}
        totalUnits={calculateDailyProduction()}
        showStaffAnalytics={showStaffAnalytics}
        setShowStaffAnalytics={setShowStaffAnalytics}
        showComparison={showComparison}
        setShowComparison={setShowComparison}
        onPrint={handlePrint}
      />

      <ProductionAnalytics
        showComparison={showComparison}
        showStaffAnalytics={showStaffAnalytics}
        comparisonDays={comparisonDays}
        setComparisonDays={setComparisonDays}
        historicalProduction={historicalProduction}
        staffStats={staffStats}
      />

      <ProductionForm
        products={products}
        recipes={recipes}
        staffMembers={staffMembers}
        recipeIngredients={recipeIngredients}
        date={date}
        onBatchCreated={handleBatchCreated}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Today's Production Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {productionBatches.length === 0 ? (
            <p className="text-gray-500">No production batches recorded for today</p>
          ) : (
            <div className="space-y-4">
              {productionBatches.map((batch) => (
                <ProductionBatchCard
                  key={batch.id}
                  batch={batch}
                  isActive={activeBatchId === batch.id}
                  ingredients={batchIngredients}
                  onToggleActive={() => setActiveBatchId(activeBatchId === batch.id ? null : batch.id)}
                  onDelete={() => {
                    if (confirm('Are you sure you want to delete this production batch?')) {
                      deleteBatchMutation.mutate(batch.id);
                      setActiveBatchId(null);
                    }
                  }}
                  onEditRecipe={(recipeId) => setEditingRecipeId(recipeId)}
                  onAddIngredient={(data) => addIngredientMutation.mutate(data)}
                  onUpdateIngredient={(id, data) => updateIngredientMutation.mutate({ ingredientId: id, data })}
                  onDeleteIngredient={(id) => deleteIngredientMutation.mutate(id)}
                  isLoading={addIngredientMutation.isPending || updateIngredientMutation.isPending || deleteIngredientMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <RecipeEditModal
        isOpen={!!editingRecipeId}
        onClose={() => setEditingRecipeId(null)}
        recipeId={editingRecipeId}
      />
      
      <Navigation />
    </div>
  );
};

export default ProductionPage;
