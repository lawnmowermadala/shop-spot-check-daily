
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';
import SimilarityWarning from '@/components/SimilarityWarning';
import { useSimilarityCheck } from '@/hooks/useSimilarityCheck';

// Types
interface Ingredient {
  id: string;
  name: string;
  weight: number;
  quantity: string;
  unit: string;
  price_ex_vat: number;
  vat_amount: number;
  total_price: number;
  supplier?: string;
  created_at?: string;
}

const IngredientsPage = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentIngredient, setCurrentIngredient] = useState<Partial<Ingredient>>({
    name: '',
    weight: 0,
    quantity: '',
    unit: 'kg',
    price_ex_vat: 0,
    vat_amount: 0,
    total_price: 0,
    supplier: ''
  });

  const {
    showSimilarityWarning,
    similarItems,
    checkSimilarity,
    proceedWithAction,
    resetSimilarityCheck
  } = useSimilarityCheck();

  // Fetch ingredients
  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Ingredient[];
    }
  });

  // Calculate VAT and total price
  const calculatePrices = (priceExVat: number) => {
    const vat = priceExVat * 0.15; // 15% VAT
    const total = priceExVat + vat;
    return { vat, total };
  };

  // Add/update ingredient mutation
  const upsertIngredient = useMutation({
    mutationFn: async (ingredient: Partial<Ingredient>) => {
      if (!ingredient.name || !ingredient.weight || !ingredient.price_ex_vat || !ingredient.quantity) {
        throw new Error('Name, weight, quantity, and price are required');
      }
      
      const { vat, total } = calculatePrices(ingredient.price_ex_vat);
      
      const { data, error } = isEditing && ingredient.id
        ? await supabase
            .from('ingredients')
            .update({
              name: ingredient.name,
              weight: ingredient.weight,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              price_ex_vat: ingredient.price_ex_vat,
              vat_amount: vat,
              total_price: total,
              supplier: ingredient.supplier
            })
            .eq('id', ingredient.id)
            .select()
        : await supabase
            .from('ingredients')
            .insert([{
              name: ingredient.name,
              weight: ingredient.weight,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              price_ex_vat: ingredient.price_ex_vat,
              vat_amount: vat,
              total_price: total,
              supplier: ingredient.supplier
            }])
            .select();
      
      if (error) throw error;
      return data?.[0] as Ingredient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      resetForm();
      toast.success(isEditing ? "Ingredient updated successfully!" : "Ingredient added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete ingredient mutation
  const deleteIngredient = useMutation({
    mutationFn: async (ingredientId: string) => {
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', ingredientId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      toast.success("Ingredient deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isEditing && currentIngredient.name) {
      // Check for similar ingredients before creating new one
      const canProceed = checkSimilarity(
        currentIngredient.name,
        undefined,
        ingredients.map(ing => ({ id: ing.id, name: ing.name })),
        () => upsertIngredient.mutate(currentIngredient)
      );
      
      if (canProceed) {
        upsertIngredient.mutate(currentIngredient);
      }
    } else {
      upsertIngredient.mutate(currentIngredient);
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setIsEditing(true);
    setCurrentIngredient(ingredient);
  };

  const handleDelete = (ingredientId: string) => {
    if (window.confirm('Are you sure you want to delete this ingredient?')) {
      deleteIngredient.mutate(ingredientId);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentIngredient({
      name: '',
      weight: 0,
      quantity: '',
      unit: 'kg',
      price_ex_vat: 0,
      vat_amount: 0,
      total_price: 0,
      supplier: ''
    });
  };

  const handlePriceChange = (priceExVat: number) => {
    const { vat, total } = calculatePrices(priceExVat);
    setCurrentIngredient({
      ...currentIngredient,
      price_ex_vat: priceExVat,
      vat_amount: vat,
      total_price: total
    });
  };

  if (showSimilarityWarning) {
    return (
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold">Ingredients Management</h1>
        <SimilarityWarning
          newName={currentIngredient.name || ''}
          similarItems={similarItems}
          itemType="ingredient"
          onProceed={proceedWithAction}
          onCancel={resetSimilarityCheck}
          isLoading={upsertIngredient.isPending}
        />
        <Navigation />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <h1 className="text-2xl font-bold">Ingredients Management</h1>
      
      {/* Add/Edit Ingredient Form */}
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Ingredient' : 'Add New Ingredient'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                placeholder="Ingredient Name"
                value={currentIngredient.name || ''}
                onChange={(e) => setCurrentIngredient({...currentIngredient, name: e.target.value})}
                required
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Weight/Size"
                value={currentIngredient.weight || ''}
                onChange={(e) => setCurrentIngredient({...currentIngredient, weight: Number(e.target.value)})}
                required
              />
              <Input
                placeholder="Quantity (e.g., 1kg, 500g, 2 units)"
                value={currentIngredient.quantity || ''}
                onChange={(e) => setCurrentIngredient({...currentIngredient, quantity: e.target.value})}
                required
              />
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={currentIngredient.unit || 'kg'}
                onChange={(e) => setCurrentIngredient({...currentIngredient, unit: e.target.value})}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="units">units</option>
              </select>
              <Input
                type="number"
                step="0.01"
                placeholder="Price Ex VAT"
                value={currentIngredient.price_ex_vat || ''}
                onChange={(e) => handlePriceChange(Number(e.target.value))}
                required
              />
              <Input
                type="number"
                step="0.01"
                placeholder="VAT Amount"
                value={currentIngredient.vat_amount?.toFixed(2) || ''}
                readOnly
                className="bg-gray-100"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Total Price"
                value={currentIngredient.total_price?.toFixed(2) || ''}
                readOnly
                className="bg-gray-100"
              />
              <Input
                placeholder="Supplier (optional)"
                value={currentIngredient.supplier || ''}
                onChange={(e) => setCurrentIngredient({...currentIngredient, supplier: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={upsertIngredient.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Ingredient' : 'Add Ingredient'}
              </Button>
              {isEditing && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Ingredients List */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredients List ({ingredients.length} ingredients)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading ingredients...</div>
          ) : ingredients.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Weight/Size</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price Ex VAT</TableHead>
                    <TableHead>VAT</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.map(ingredient => (
                    <TableRow key={ingredient.id}>
                      <TableCell className="font-medium">{ingredient.name}</TableCell>
                      <TableCell>{ingredient.weight} {ingredient.unit}</TableCell>
                      <TableCell>{ingredient.quantity}</TableCell>
                      <TableCell>R{ingredient.price_ex_vat.toFixed(2)}</TableCell>
                      <TableCell>R{ingredient.vat_amount.toFixed(2)}</TableCell>
                      <TableCell className="font-bold">R{ingredient.total_price.toFixed(2)}</TableCell>
                      <TableCell>{ingredient.supplier || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(ingredient)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(ingredient.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No ingredients found. Add your first ingredient above.
            </div>
          )}
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default IngredientsPage;
