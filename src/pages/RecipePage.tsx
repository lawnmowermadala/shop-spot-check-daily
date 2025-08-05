import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Plus, Printer, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';
import SimilarityWarning from '@/components/SimilarityWarning';
import { useSimilarityCheck } from '@/hooks/useSimilarityCheck';

// Types
interface Recipe {
  id: string;
  name: string;
  description: string | null;
  batch_size: number;
  unit: string;
  created_at: string;
}

interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  pack_size: number | null;
  pack_unit: string | null;
  pack_price: number | null;
  quantity_used: number | null;
  used_unit: string | null;
  calculated_cost: number | null;
}

interface Ingredient {
  id: string;
  name: string;
  weight: number;
  unit: string;
  price_ex_vat: number;
  total_price: number;
}

const SearchableDropdown = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  className = ""
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        className="w-full p-2 border rounded flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? "transform rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none max-h-60 overflow-auto">
          <div className="px-2 py-1 sticky top-0 bg-white border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-2 text-gray-500">No options found</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                  value === option.value ? "bg-gray-100 font-medium" : ""
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const RecipePage = () => {
  const queryClient = useQueryClient();
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);

  // Recipe form state
  const [recipeData, setRecipeData] = useState({
    name: '',
    description: '',
    batch_size: '',
    unit: 'units'
  });

  const {
    showSimilarityWarning,
    similarItems,
    checkSimilarity,
    proceedWithAction,
    resetSimilarityCheck
  } = useSimilarityCheck();

  // Ingredient form state
  const [ingredientData, setIngredientData] = useState({
    ingredient_id: '',
    ingredient_name: '',
    pack_size: '',
    pack_unit: 'kg',
    pack_price: '',
    quantity_used: '',
    used_unit: 'g'
  });

  // Edit states
  const [editIngredientData, setEditIngredientData] = useState({
    ingredient_id: '',
    ingredient_name: '',
    pack_size: '',
    pack_unit: '',
    pack_price: '',
    quantity_used: '',
    used_unit: ''
  });

  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');

  // Unit options
  const unitOptions = [
    { value: 'units', label: 'units' },
    { value: 'kg', label: 'kg' },
    { value: 'g', label: 'g' },
    { value: 'l', label: 'l' },
    { value: 'ml', label: 'ml' }
  ];

  const packUnitOptions = [
    { value: 'kg', label: 'kg' },
    { value: 'g', label: 'g' },
    { value: 'l', label: 'l' },
    { value: 'ml', label: 'ml' },
    { value: 'units', label: 'units' }
  ];

  const usedUnitOptions = [
    { value: 'g', label: 'g' },
    { value: 'kg', label: 'kg' },
    { value: 'ml', label: 'ml' },
    { value: 'l', label: 'l' },
    { value: 'units', label: 'units' }
  ];

  // Fetch all ingredients from the ingredients table
  const { data: availableIngredients = [] } = useQuery({
    queryKey: ['available-ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Ingredient[];
    }
  });

  // Fetch Recipes
  const { data: recipes = [], isLoading: recipesLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Recipe[];
    }
  });

  // Fetch Recipe Ingredients
  const { data: recipeIngredients = [], isLoading: ingredientsLoading } = useQuery({
    queryKey: ['recipe-ingredients', selectedRecipeId],
    queryFn: async () => {
      if (!selectedRecipeId) return [];
      
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', selectedRecipeId)
        .order('ingredient_name');
      
      if (error) throw error;
      return data as RecipeIngredient[];
    },
    enabled: !!selectedRecipeId
  });

  // Handle ingredient selection from dropdown
  const handleIngredientSelect = (ingredientId: string) => {
    const selectedIngredient = availableIngredients.find(ing => ing.id === ingredientId);
    if (selectedIngredient && ingredientId !== 'manual-entry') {
      setIngredientData({
        ingredient_id: selectedIngredient.id,
        ingredient_name: selectedIngredient.name,
        pack_size: selectedIngredient.weight.toString(),
        pack_unit: selectedIngredient.unit,
        pack_price: selectedIngredient.total_price.toString(),
        quantity_used: '',
        used_unit: 'g'
      });
    } else {
      // Clear form for manual entry
      setIngredientData({
        ingredient_id: '',
        ingredient_name: '',
        pack_size: '',
        pack_unit: 'kg',
        pack_price: '',
        quantity_used: '',
        used_unit: 'g'
      });
    }
  };

  // Calculate cost per unit based on pack size and price
  const calculateCostPerUnit = (packPrice: string, packSize: string, packUnit: string, usedUnit: string) => {
    const price = Number(packPrice);
    const size = Number(packSize);
    
    if (!price || !size) return 0;

    let conversionFactor = 1;
    
    // Convert pack unit to used unit
    if (packUnit === 'kg' && usedUnit === 'g') {
      conversionFactor = 1000;
    } else if (packUnit === 'l' && usedUnit === 'ml') {
      conversionFactor = 1000;
    } else if (packUnit === 'g' && usedUnit === 'kg') {
      conversionFactor = 0.001;
    } else if (packUnit === 'ml' && usedUnit === 'l') {
      conversionFactor = 0.001;
    }
    
    return price / (size * conversionFactor);
  };

  // Add Recipe
  const addRecipe = useMutation({
    mutationFn: async () => {
      if (!recipeData.name || !recipeData.batch_size) {
        throw new Error('Please fill all required fields');
      }

      const { data, error } = await supabase
        .from('recipes')
        .insert({
          name: recipeData.name,
          description: recipeData.description || null,
          batch_size: Number(recipeData.batch_size),
          unit: recipeData.unit
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setRecipeData({ name: '', description: '', batch_size: '', unit: 'units' });
      setSelectedRecipeId(data.id);
      toast.success("Recipe added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Add Recipe Ingredient
  const addIngredient = useMutation({
    mutationFn: async () => {
      if (!selectedRecipeId || !ingredientData.ingredient_name || !ingredientData.quantity_used) {
        throw new Error('Please select a recipe and fill all required fields');
      }

      const costPerUnit = calculateCostPerUnit(
        ingredientData.pack_price,
        ingredientData.pack_size,
        ingredientData.pack_unit,
        ingredientData.used_unit
      );
      
      const quantityUsed = Number(ingredientData.quantity_used);
      const calculatedCost = costPerUnit * quantityUsed;

      const { error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: selectedRecipeId,
          ingredient_name: ingredientData.ingredient_name,
          quantity: quantityUsed,
          unit: ingredientData.used_unit,
          cost_per_unit: costPerUnit,
          pack_size: Number(ingredientData.pack_size) || null,
          pack_unit: ingredientData.pack_unit || null,
          pack_price: Number(ingredientData.pack_price) || null,
          quantity_used: quantityUsed,
          used_unit: ingredientData.used_unit,
          calculated_cost: calculatedCost
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-ingredients'] });
      setIngredientData({
        ingredient_id: '',
        ingredient_name: '',
        pack_size: '',
        pack_unit: 'kg',
        pack_price: '',
        quantity_used: '',
        used_unit: 'g'
      });
      toast("Ingredient added successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Delete Recipe Ingredient
  const deleteIngredient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-ingredients'] });
      toast("Ingredient removed successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Delete Recipe
  const deleteRecipe = useMutation({
    mutationFn: async (recipeId: string) => {
      // First delete all recipe ingredients
      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipeId);
      
      if (ingredientsError) throw ingredientsError;
      
      // Then delete the recipe
      const { error: recipeError } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId);
      
      if (recipeError) throw recipeError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      // Clear selected recipe if it was deleted
      setSelectedRecipeId('');
      toast("Recipe deleted successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Calculate total recipe cost
  const totalRecipeCost = recipeIngredients.reduce((sum, ingredient) => 
    sum + (ingredient.calculated_cost || 0), 0
  );

  const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);
  const costPerUnit = selectedRecipe ? totalRecipeCost / selectedRecipe.batch_size : 0;

  // Print function
  const handlePrint = () => {
    const printContent = document.getElementById('recipes-print-content');
    if (!printContent) return;

    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    
    // Add print styles
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        .recipe-card { page-break-inside: avoid; margin-bottom: 30px; border: 1px solid #ccc; padding: 15px; }
        .recipe-header { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 5px; }
        .recipe-info { margin-bottom: 15px; }
        .ingredients-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .ingredients-table th, .ingredients-table td { border: 1px solid #ccc; padding: 5px; text-align: left; }
        .ingredients-table th { background-color: #f5f5f5; font-weight: bold; }
        .cost-summary { font-weight: bold; font-size: 14px; border-top: 2px solid #333; padding-top: 10px; }
        .page-break { page-break-before: always; }
      }
    `;
    document.head.appendChild(style);
    
    window.print();
    
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to restore functionality
  };

  // Prepare ingredient options for dropdown
  const ingredientOptions = [
    { value: 'manual-entry', label: 'Manual Entry' },
    ...availableIngredients.map(ingredient => ({
      value: ingredient.id,
      label: `${ingredient.name} (${ingredient.weight} ${ingredient.unit} - R${ingredient.total_price.toFixed(2)})`
    }))
  ];

  const handleRecipeSubmit = () => {
    if (recipeData.name) {
      // Check for similar recipes before creating new one
      const canProceed = checkSimilarity(
        recipeData.name,
        undefined,
        recipes.map(recipe => ({ id: recipe.id, name: recipe.name })),
        () => addRecipe.mutate()
      );
      
      if (canProceed) {
        addRecipe.mutate();
      }
    }
  };

  if (showSimilarityWarning) {
    return (
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold">Recipe Management</h1>
        <SimilarityWarning
          newName={recipeData.name || ''}
          similarItems={similarItems}
          itemType="recipe"
          onProceed={proceedWithAction}
          onCancel={resetSimilarityCheck}
          isLoading={addRecipe.isPending}
        />
        <Navigation />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Recipe Management</h1>
        <Button 
          onClick={handlePrint}
          variant="outline"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Recipes
        </Button>
      </div>

      {/* Hidden print content */}
      <div id="recipes-print-content" style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Recipe List with Costs</h1>
          <p style={{ fontSize: '14px', color: '#666' }}>Generated on {new Date().toLocaleDateString()}</p>
        </div>
        
        {recipes.map((recipe, index) => {
          const recipeIngredientsForPrint = recipeIngredients.filter(ing => ing.recipe_id === recipe.id);
          const recipeTotalCost = recipeIngredientsForPrint.reduce((sum, ingredient) => 
            sum + (ingredient.calculated_cost || 0), 0
          );
          const recipeCostPerUnit = recipe.batch_size > 0 ? recipeTotalCost / recipe.batch_size : 0;

          return (
            <div key={recipe.id} className={`recipe-card ${index > 0 ? 'page-break' : ''}`}>
              <div className="recipe-header">
                {recipe.name}
              </div>
              
              <div className="recipe-info">
                <p><strong>Description:</strong> {recipe.description || 'N/A'}</p>
                <p><strong>Batch Size:</strong> {recipe.batch_size} {recipe.unit}</p>
                <p><strong>Created:</strong> {new Date(recipe.created_at).toLocaleDateString()}</p>
              </div>

              {recipeIngredientsForPrint.length > 0 ? (
                <>
                  <table className="ingredients-table">
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Quantity Used</th>
                        <th>Pack Info</th>
                        <th>Cost per Unit</th>
                        <th>Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipeIngredientsForPrint.map(ingredient => (
                        <tr key={ingredient.id}>
                          <td>{ingredient.ingredient_name}</td>
                          <td>{ingredient.quantity_used} {ingredient.used_unit}</td>
                          <td>{ingredient.pack_size} {ingredient.pack_unit} @ R{ingredient.pack_price?.toFixed(2)}</td>
                          <td>R{ingredient.cost_per_unit.toFixed(4)}</td>
                          <td>R{ingredient.calculated_cost?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="cost-summary">
                    <p>Total Recipe Cost: R{recipeTotalCost.toFixed(2)}</p>
                    <p>Cost per {recipe.unit}: R{recipeCostPerUnit.toFixed(2)}</p>
                  </div>
                </>
              ) : (
                <p style={{ fontStyle: 'italic', color: '#666' }}>No ingredients added to this recipe yet.</p>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Add Recipe Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Recipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium">Recipe Name *</label>
              <Input
                value={recipeData.name}
                onChange={(e) => setRecipeData({...recipeData, name: e.target.value})}
                placeholder="Enter recipe name"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Batch Size *</label>
              <Input
                type="number"
                step="0.01"
                value={recipeData.batch_size}
                onChange={(e) => setRecipeData({...recipeData, batch_size: e.target.value})}
                placeholder="Enter batch size"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Unit</label>
              <SearchableDropdown
                options={unitOptions}
                value={recipeData.unit}
                onChange={(value) => setRecipeData({...recipeData, unit: value})}
                placeholder="Select unit"
                searchPlaceholder="Search units..."
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Description</label>
              <Input
                value={recipeData.description}
                onChange={(e) => setRecipeData({...recipeData, description: e.target.value})}
                placeholder="Recipe description (optional)"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleRecipeSubmit}
            disabled={addRecipe.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {addRecipe.isPending ? "Adding..." : "Add Recipe"}
          </Button>
        </CardContent>
      </Card>

      {/* Recipe Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Recipe to Manage</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchableDropdown
            options={recipes.map(recipe => ({
              value: recipe.id,
              label: `${recipe.name} (Batch: ${recipe.batch_size} ${recipe.unit})`
            }))}
            value={selectedRecipeId}
            onChange={setSelectedRecipeId}
            placeholder="Select a recipe to add ingredients"
            searchPlaceholder="Search recipes..."
          />
        </CardContent>
      </Card>

      {/* Add Ingredients Form */}
      {selectedRecipeId && (
        <Card>
          <CardHeader>
            <CardTitle>Add Ingredient to Recipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ingredient Selection Dropdown */}
            <div>
              <label className="block mb-1 text-sm font-medium">Select from Available Ingredients (Optional)</label>
              <SearchableDropdown
                options={ingredientOptions}
                value={ingredientData.ingredient_id || 'manual-entry'}
                onChange={handleIngredientSelect}
                placeholder="Select an existing ingredient or leave blank for manual entry"
                searchPlaceholder="Search ingredients..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Ingredient Name *</label>
                <Input
                  value={ingredientData.ingredient_name}
                  onChange={(e) => setIngredientData({...ingredientData, ingredient_name: e.target.value})}
                  placeholder="Enter ingredient name"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Pack Size *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={ingredientData.pack_size}
                  onChange={(e) => setIngredientData({...ingredientData, pack_size: e.target.value})}
                  placeholder="Enter pack size"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Pack Unit</label>
                <SearchableDropdown
                  options={packUnitOptions}
                  value={ingredientData.pack_unit}
                  onChange={(value) => setIngredientData({...ingredientData, pack_unit: value})}
                  placeholder="Select pack unit"
                  searchPlaceholder="Search units..."
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Pack Price *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={ingredientData.pack_price}
                  onChange={(e) => setIngredientData({...ingredientData, pack_price: e.target.value})}
                  placeholder="Enter pack price"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Quantity Used *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={ingredientData.quantity_used}
                  onChange={(e) => setIngredientData({...ingredientData, quantity_used: e.target.value})}
                  placeholder="Enter quantity used"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Used Unit</label>
                <SearchableDropdown
                  options={usedUnitOptions}
                  value={ingredientData.used_unit}
                  onChange={(value) => setIngredientData({...ingredientData, used_unit: value})}
                  placeholder="Select used unit"
                  searchPlaceholder="Search units..."
                />
              </div>
            </div>
            
            {/* Cost Preview */}
            {ingredientData.pack_price && ingredientData.pack_size && ingredientData.quantity_used && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600 font-medium mb-1">Cost Preview:</p>
                <p className="text-sm">
                  Cost per {ingredientData.used_unit}: R{calculateCostPerUnit(
                    ingredientData.pack_price,
                    ingredientData.pack_size,
                    ingredientData.pack_unit,
                    ingredientData.used_unit
                  ).toFixed(4)}
                </p>
                <p className="text-sm font-bold text-green-600">
                  Total Cost: R{(calculateCostPerUnit(
                    ingredientData.pack_price,
                    ingredientData.pack_size,
                    ingredientData.pack_unit,
                    ingredientData.used_unit
                  ) * Number(ingredientData.quantity_used)).toFixed(2)}
                </p>
              </div>
            )}
            
            <Button 
              onClick={() => addIngredient.mutate()}
              disabled={addIngredient.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {addIngredient.isPending ? "Adding..." : "Add Ingredient"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recipe Ingredients List */}
      {selectedRecipeId && (
        <Card>
          <CardHeader>
            <CardTitle>
              Recipe Ingredients 
              {selectedRecipe && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  - {selectedRecipe.name} (Total Cost: R{totalRecipeCost.toFixed(2)} | Cost per {selectedRecipe.unit}: R{costPerUnit.toFixed(2)})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ingredientsLoading ? (
              <div className="text-center py-4">Loading ingredients...</div>
            ) : recipeIngredients.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Quantity Used</TableHead>
                      <TableHead>Pack Info</TableHead>
                      <TableHead>Cost per Unit</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipeIngredients.map(ingredient => (
                      <TableRow key={ingredient.id}>
                        <TableCell className="font-medium">{ingredient.ingredient_name}</TableCell>
                        <TableCell>{ingredient.quantity_used} {ingredient.used_unit}</TableCell>
                        <TableCell>
                          {ingredient.pack_size} {ingredient.pack_unit} @ R{ingredient.pack_price?.toFixed(2)}
                        </TableCell>
                        <TableCell>R{ingredient.cost_per_unit.toFixed(4)}</TableCell>
                        <TableCell className="font-bold text-green-600">
                          R{ingredient.calculated_cost?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost"
                            size="icon" 
                            className="text-red-500 hover:text-red-700 h-8 w-8"
                            onClick={() => {
                              if(confirm('Are you sure you want to remove this ingredient?')) {
                                deleteIngredient.mutate(ingredient.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No ingredients added to this recipe yet.</p>
                <p className="text-sm">Add ingredients using the form above.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recipes List */}
      <Card>
        <CardHeader>
          <CardTitle>All Recipes ({recipes.length} recipes)</CardTitle>
        </CardHeader>
        <CardContent>
          {recipesLoading ? (
            <div className="text-center py-4">Loading recipes...</div>
          ) : recipes.length > 0 ? (
            <div className="grid gap-4">
              {recipes.map(recipe => (
                <div key={recipe.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{recipe.name}</h3>
                      <p className="text-gray-600">{recipe.description}</p>
                      <p className="text-sm text-gray-500">
                        Batch Size: {recipe.batch_size} {recipe.unit}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedRecipeId(recipe.id)}
                      >
                        {selectedRecipeId === recipe.id ? 'Selected' : 'Select'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`)) {
                            deleteRecipe.mutate(recipe.id);
                          }
                        }}
                        disabled={deleteRecipe.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No recipes found.</p>
              <p className="text-sm">Add your first recipe using the form above.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default RecipePage;
