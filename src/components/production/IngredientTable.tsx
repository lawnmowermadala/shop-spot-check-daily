
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Save, X, Trash2 } from 'lucide-react';

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

interface IngredientTableProps {
  ingredients: ProductionIngredient[];
  onAddIngredient: (data: any) => void;
  onUpdateIngredient: (id: string, data: any) => void;
  onDeleteIngredient: (id: string) => void;
  isLoading?: boolean;
}

const IngredientTable = ({
  ingredients,
  onAddIngredient,
  onUpdateIngredient,
  onDeleteIngredient,
  isLoading = false
}: IngredientTableProps) => {
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  
  const [ingredientData, setIngredientData] = useState({
    ingredient_name: '',
    quantity_used: '',
    unit: 'kg',
    cost_per_unit: '',
    pack_size: '',
    pack_price: ''
  });

  const [editIngredientData, setEditIngredientData] = useState({
    ingredient_name: '',
    quantity_used: '',
    unit: 'kg',
    cost_per_unit: '',
    pack_size: '',
    pack_price: ''
  });

  const handleEditIngredient = (ingredient: ProductionIngredient) => {
    setEditingIngredientId(ingredient.id);
    setEditIngredientData({
      ingredient_name: ingredient.ingredient_name,
      quantity_used: ingredient.quantity_used.toString(),
      unit: ingredient.unit,
      cost_per_unit: ingredient.cost_per_unit.toString(),
      pack_size: ingredient.pack_size ? ingredient.pack_size.toString() : '',
      pack_price: ingredient.pack_price ? ingredient.pack_price.toString() : ''
    });
  };

  const handleUpdateIngredient = () => {
    if (!editingIngredientId) return;
    onUpdateIngredient(editingIngredientId, editIngredientData);
    handleCancelEdit();
  };

  const handleCancelEdit = () => {
    setEditingIngredientId(null);
    setEditIngredientData({
      ingredient_name: '',
      quantity_used: '',
      unit: 'kg',
      cost_per_unit: '',
      pack_size: '',
      pack_price: ''
    });
  };

  const handleAddIngredient = () => {
    onAddIngredient(ingredientData);
    setIngredientData({
      ingredient_name: '',
      quantity_used: '',
      unit: 'kg',
      cost_per_unit: '',
      pack_size: '',
      pack_price: ''
    });
  };

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="text-sm font-medium mb-2">Ingredients Used</h4>
      {ingredients.length === 0 ? (
        <p className="text-gray-500 text-sm">No ingredients recorded for this batch</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingredient</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Cost per Unit</TableHead>
              <TableHead>Pack Size</TableHead>
              <TableHead>Pack Price</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients.map((ingredient) => (
              <TableRow key={ingredient.id}>
                {editingIngredientId === ingredient.id ? (
                  <>
                    <TableCell>
                      <Input
                        value={editIngredientData.ingredient_name}
                        onChange={(e) => setEditIngredientData({
                          ...editIngredientData,
                          ingredient_name: e.target.value
                        })}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editIngredientData.quantity_used}
                        onChange={(e) => setEditIngredientData({
                          ...editIngredientData,
                          quantity_used: e.target.value
                        })}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        value={editIngredientData.unit}
                        onChange={(e) => setEditIngredientData({
                          ...editIngredientData,
                          unit: e.target.value
                        })}
                        className="w-20 p-1 border rounded"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="ml">ml</option>
                        <option value="unit">unit</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editIngredientData.cost_per_unit}
                        onChange={(e) => setEditIngredientData({
                          ...editIngredientData,
                          cost_per_unit: e.target.value
                        })}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editIngredientData.pack_size}
                        onChange={(e) => setEditIngredientData({
                          ...editIngredientData,
                          pack_size: e.target.value
                        })}
                        className="w-24"
                        placeholder="Pack Size"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editIngredientData.pack_price}
                        onChange={(e) => setEditIngredientData({
                          ...editIngredientData,
                          pack_price: e.target.value
                        })}
                        className="w-24"
                        placeholder="Pack Price"
                      />
                    </TableCell>
                    <TableCell>
                      R{(Number(editIngredientData.quantity_used) * Number(editIngredientData.cost_per_unit)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleUpdateIngredient}
                          disabled={isLoading}
                        >
                          <Save className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{ingredient.ingredient_name}</TableCell>
                    <TableCell>{ingredient.quantity_used}</TableCell>
                    <TableCell>{ingredient.unit}</TableCell>
                    <TableCell>R{ingredient.cost_per_unit.toFixed(2)}</TableCell>
                    <TableCell>{ingredient.pack_size ? ingredient.pack_size : "-"}</TableCell>
                    <TableCell>{ingredient.pack_price ? "R"+ingredient.pack_price.toFixed(2) : "-"}</TableCell>
                    <TableCell>R{(ingredient.quantity_used * ingredient.cost_per_unit).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditIngredient(ingredient)}
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteIngredient(ingredient.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
      <div className="mt-4 border-t pt-4">
        <h4 className="text-sm font-medium mb-2">Add New Ingredient</h4>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          <div className="md:col-span-2">
            <Input
              value={ingredientData.ingredient_name}
              onChange={(e) => setIngredientData({...ingredientData, ingredient_name: e.target.value})}
              placeholder="Ingredient name"
            />
          </div>
          <div>
            <Input
              type="number"
              value={ingredientData.quantity_used}
              onChange={(e) => setIngredientData({...ingredientData, quantity_used: e.target.value})}
              placeholder="Quantity"
            />
          </div>
          <div>
            <select
              value={ingredientData.unit}
              onChange={(e) => setIngredientData({...ingredientData, unit: e.target.value})}
              className="w-full p-2 border rounded"
            >
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="L">L</option>
              <option value="ml">ml</option>
              <option value="unit">unit</option>
            </select>
          </div>
          <div>
            <Input
              type="number"
              value={ingredientData.cost_per_unit}
              onChange={(e) => setIngredientData({...ingredientData, cost_per_unit: e.target.value})}
              placeholder="Cost per unit"
            />
          </div>
          <div>
            <Input
              type="number"
              value={ingredientData.pack_size}
              onChange={(e) => setIngredientData({...ingredientData, pack_size: e.target.value})}
              placeholder="Pack Size"
            />
          </div>
          <div>
            <Input
              type="number"
              value={ingredientData.pack_price}
              onChange={(e) => setIngredientData({...ingredientData, pack_price: e.target.value})}
              placeholder="Pack Price"
            />
          </div>
        </div>
        <div className="mt-2">
          <Button 
            onClick={handleAddIngredient}
            disabled={isLoading || !ingredientData.ingredient_name || !ingredientData.quantity_used}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isLoading ? 'Adding...' : 'Add Ingredient'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IngredientTable;
