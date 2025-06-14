
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import IngredientTable from './IngredientTable';

interface ProductionBatch {
  id: string;
  product_id: string;
  product_name: string;
  product_code?: string;
  recipe_id?: string;
  recipe_name?: string;
  quantity_produced: number;
  production_date: string;
  staff_name: string;
  staff_id?: string;
  notes?: string;
  total_ingredient_cost?: number;
  cost_per_unit?: number;
  created_at: string;
}

interface ProductionIngredient {
  id: string;
  batch_id: string;
  ingredient_name: string;
  quantity_used: number;
  unit: string;
  cost_per_unit: number;
  pack_size?: number;
  pack_price?: number;
  created_at: string;
}

interface ProductionBatchCardProps {
  batch: ProductionBatch;
  isActive: boolean;
  ingredients: ProductionIngredient[];
  onToggleActive: () => void;
  onDelete: () => void;
  onEditRecipe: (recipeId: string) => void;
  onAddIngredient: (data: any) => void;
  onUpdateIngredient: (id: string, data: any) => void;
  onDeleteIngredient: (id: string) => void;
  isLoading?: boolean;
}

const ProductionBatchCard = ({
  batch,
  isActive,
  ingredients,
  onToggleActive,
  onDelete,
  onEditRecipe,
  onAddIngredient,
  onUpdateIngredient,
  onDeleteIngredient,
  isLoading = false
}: ProductionBatchCardProps) => {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{batch.product_code} - {batch.product_name}</h3>
          {batch.recipe_name && batch.recipe_name !== 'No Recipe' && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-blue-600">Recipe: {batch.recipe_name}</p>
              {batch.recipe_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditRecipe(batch.recipe_id!)}
                  className="h-6 px-2 text-xs"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit Recipe
                </Button>
              )}
            </div>
          )}
          <p className="text-sm text-gray-600">
            {batch.quantity_produced} units • {batch.staff_name}
          </p>
          {batch.total_ingredient_cost && batch.total_ingredient_cost > 0 && (
            <p className="text-sm text-green-600">
              Total Cost: R{batch.total_ingredient_cost.toFixed(2)} • 
              Cost per Unit: R{batch.cost_per_unit?.toFixed(2) || '0.00'}
            </p>
          )}
          {batch.notes && (
            <p className="text-sm mt-1 text-gray-600">Notes: {batch.notes}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Created: {new Date(batch.created_at).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleActive}
          >
            {isActive ? 'Hide Ingredients' : 'Show Ingredients'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {isActive && (
        <IngredientTable
          ingredients={ingredients}
          onAddIngredient={onAddIngredient}
          onUpdateIngredient={onUpdateIngredient}
          onDeleteIngredient={onDeleteIngredient}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default ProductionBatchCard;
