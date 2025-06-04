
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';

// Types
interface Ingredient {
  id: string;
  name: string;
  weight: number;
  unit: string;
  price_ex_vat: number;
  vat_amount: number;
  total_price: number;
  supplier: string | null;
  created_at: string;
}

interface Recipe {
  id: string;
  name: string;
}

const IngredientsPage = () => {
  const queryClient = useQueryClient();
  
  // Form state
  const [ingredientData, setIngredientData] = useState({
    name: '',
    weight: '',
    unit: 'kg',
    price_ex_vat: '',
    supplier: ''
  });

  // Calculate VAT (14%)
  const calculateVAT = (priceExVat: number) => {
    return priceExVat * 0.14;
  };

  // Calculate total price including VAT
  const calculateTotalPrice = (priceExVat: number) => {
    return priceExVat + calculateVAT(priceExVat);
  };

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

  // Fetch recipes for linking
  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes_for_ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name');
      
      if (error) throw error;
      return data as Recipe[];
    }
  });

  // Add ingredient mutation
  const addIngredient = useMutation({
    mutationFn: async () => {
      if (!ingredientData.name || !ingredientData.weight || !ingredientData.price_ex_vat) {
        throw new Error('Please fill all required fields');
      }

      const priceExVat = Number(ingredientData.price_ex_vat);
      const vatAmount = calculateVAT(priceExVat);
      const totalPrice = calculateTotalPrice(priceExVat);

      const { data, error } = await supabase
        .from('ingredients')
        .insert({
          name: ingredientData.name,
          weight: Number(ingredientData.weight),
          unit: ingredientData.unit,
          price_ex_vat: priceExVat,
          vat_amount: vatAmount,
          total_price: totalPrice,
          supplier: ingredientData.supplier || null
        })
        .select();
      
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setIngredientData({
        name: '',
        weight: '',
        unit: 'kg',
        price_ex_vat: '',
        supplier: ''
      });
      toast("Ingredient added successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
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
      toast("Ingredient deleted successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Calculate preview values
  const previewVAT = ingredientData.price_ex_vat ? calculateVAT(Number(ingredientData.price_ex_vat)) : 0;
  const previewTotal = ingredientData.price_ex_vat ? calculateTotalPrice(Number(ingredientData.price_ex_vat)) : 0;

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ingredients Management</h1>
      </div>
      
      {/* Add Ingredient Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Ingredient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium">Ingredient Name *</label>
              <Input
                value={ingredientData.name}
                onChange={(e) => setIngredientData({...ingredientData, name: e.target.value})}
                placeholder="e.g., Flour, Sugar, etc."
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Weight *</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={ingredientData.weight}
                  onChange={(e) => setIngredientData({...ingredientData, weight: e.target.value})}
                  placeholder="Weight"
                  step="0.01"
                />
                <Select 
                  value={ingredientData.unit} 
                  onValueChange={(value) => setIngredientData({...ingredientData, unit: value})}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="l">l</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="units">units</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Price (Excl. VAT) *</label>
              <Input
                type="number"
                value={ingredientData.price_ex_vat}
                onChange={(e) => setIngredientData({...ingredientData, price_ex_vat: e.target.value})}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Supplier (Optional)</label>
              <Input
                value={ingredientData.supplier}
                onChange={(e) => setIngredientData({...ingredientData, supplier: e.target.value})}
                placeholder="Supplier name"
              />
            </div>
          </div>
          
          {/* Price Preview */}
          {ingredientData.price_ex_vat && (
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Price (Excl. VAT):</span>
                  <div className="font-medium">R{Number(ingredientData.price_ex_vat).toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-gray-600">VAT (14%):</span>
                  <div className="font-medium">R{previewVAT.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Price:</span>
                  <div className="font-bold text-lg">R{previewTotal.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
          
          <Button 
            onClick={() => addIngredient.mutate()}
            disabled={addIngredient.isPending || !ingredientData.name || !ingredientData.weight || !ingredientData.price_ex_vat}
            className="mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            {addIngredient.isPending ? "Adding..." : "Add Ingredient"}
          </Button>
        </CardContent>
      </Card>
      
      {/* Ingredients List */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredients Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading ingredients...</p>
          ) : ingredients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Price (Excl. VAT)</TableHead>
                  <TableHead>VAT (14%)</TableHead>
                  <TableHead>Total Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.map(ingredient => (
                  <TableRow key={ingredient.id}>
                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                    <TableCell>{ingredient.weight} {ingredient.unit}</TableCell>
                    <TableCell>R{ingredient.price_ex_vat.toFixed(2)}</TableCell>
                    <TableCell>R{ingredient.vat_amount.toFixed(2)}</TableCell>
                    <TableCell className="font-medium">R{ingredient.total_price.toFixed(2)}</TableCell>
                    <TableCell>{ingredient.supplier || '-'}</TableCell>
                    <TableCell>{new Date(ingredient.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost"
                        size="icon" 
                        className="text-red-500 hover:text-red-700 h-8 w-8"
                        onClick={() => {
                          if(confirm('Are you sure you want to delete this ingredient?')) {
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
          ) : (
            <p className="text-gray-500">No ingredients added yet. Add your first ingredient above.</p>
          )}
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default IngredientsPage;
