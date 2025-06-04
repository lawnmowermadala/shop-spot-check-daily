
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';

// Updated interface to match the database schema
interface Ingredient {
  id: string;
  name: string;
  weight: number;
  unit: string;
  price_ex_vat: number;
  vat_amount: number;
  total_price: number;
  supplier: string | null;
  quantity: string;
  product_id: string | null;
  created_at: string | null;
}

const IngredientsPage = () => {
  const queryClient = useQueryClient();
  
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    weight: '',
    unit: 'kg',
    price_ex_vat: '',
    supplier: ''
  });

  // Fetch all ingredients
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
  const calculateVAT = (priceExVat: number) => {
    const vatAmount = priceExVat * 0.14;
    const totalPrice = priceExVat + vatAmount;
    return { vatAmount, totalPrice };
  };

  // Add new ingredient
  const addIngredient = useMutation({
    mutationFn: async () => {
      if (!newIngredient.name || !newIngredient.weight || !newIngredient.price_ex_vat) {
        throw new Error('Please fill in all required fields');
      }

      const priceExVat = parseFloat(newIngredient.price_ex_vat);
      const weight = parseFloat(newIngredient.weight);
      const { vatAmount, totalPrice } = calculateVAT(priceExVat);

      const { data, error } = await supabase
        .from('ingredients')
        .insert({
          name: newIngredient.name,
          weight: weight,
          unit: newIngredient.unit,
          price_ex_vat: priceExVat,
          vat_amount: vatAmount,
          total_price: totalPrice,
          supplier: newIngredient.supplier || null,
          quantity: `${weight} ${newIngredient.unit}` // Keep existing quantity format
        })
        .select();
      
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setNewIngredient({
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

  // Delete ingredient
  const deleteIngredient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id);
      
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addIngredient.mutate();
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ingredients Management</h1>
      </div>
      
      {/* Add New Ingredient Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Ingredient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Ingredient Name *</label>
                <Input
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient({...newIngredient, name: e.target.value})}
                  placeholder="e.g., Flour, Sugar, etc."
                  required
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Weight *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newIngredient.weight}
                  onChange={(e) => setNewIngredient({...newIngredient, weight: e.target.value})}
                  placeholder="e.g., 5"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Unit</label>
                <select 
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient({...newIngredient, unit: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="l">l</option>
                  <option value="ml">ml</option>
                  <option value="pieces">pieces</option>
                  <option value="units">units</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Price (Ex VAT) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newIngredient.price_ex_vat}
                  onChange={(e) => setNewIngredient({...newIngredient, price_ex_vat: e.target.value})}
                  placeholder="e.g., 45.00"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Supplier</label>
                <Input
                  value={newIngredient.supplier}
                  onChange={(e) => setNewIngredient({...newIngredient, supplier: e.target.value})}
                  placeholder="e.g., ABC Suppliers"
                />
              </div>
              
              {/* VAT Preview */}
              {newIngredient.price_ex_vat && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="text-sm font-medium mb-2">Price Breakdown:</h4>
                  <div className="text-sm space-y-1">
                    <div>Ex VAT: R{parseFloat(newIngredient.price_ex_vat || '0').toFixed(2)}</div>
                    <div>VAT (14%): R{(parseFloat(newIngredient.price_ex_vat || '0') * 0.14).toFixed(2)}</div>
                    <div className="font-medium">Total: R{(parseFloat(newIngredient.price_ex_vat || '0') * 1.14).toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              disabled={addIngredient.isPending}
              className="mt-4"
            >
              {addIngredient.isPending ? "Adding..." : "Add Ingredient"}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Ingredients List */}
      <Card>
        <CardHeader>
          <CardTitle>All Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading ingredients...</p>
          ) : ingredients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Weight & Unit</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Price (Ex VAT)</TableHead>
                  <TableHead>VAT (14%)</TableHead>
                  <TableHead>Total Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.map(ingredient => (
                  <TableRow key={ingredient.id}>
                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                    <TableCell>{ingredient.weight} {ingredient.unit}</TableCell>
                    <TableCell>{ingredient.supplier || 'N/A'}</TableCell>
                    <TableCell>R{ingredient.price_ex_vat.toFixed(2)}</TableCell>
                    <TableCell>R{ingredient.vat_amount.toFixed(2)}</TableCell>
                    <TableCell className="font-medium">R{ingredient.total_price.toFixed(2)}</TableCell>
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
