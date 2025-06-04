
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';

// Types - matching the actual database schema
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
  created_at: string;
}

const IngredientsPage = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    weight: '',
    unit: 'kg',
    price_ex_vat: '',
    supplier: ''
  });

  // Fetch Ingredients
  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Ingredient[];
    }
  });

  // Calculate VAT (14%)
  const calculateVAT = (priceExVat: number) => {
    return priceExVat * 0.14;
  };

  // Calculate total price
  const calculateTotalPrice = (priceExVat: number) => {
    return priceExVat + calculateVAT(priceExVat);
  };

  // Add/Update Ingredient
  const saveIngredient = useMutation({
    mutationFn: async () => {
      if (!formData.name || !formData.weight || !formData.price_ex_vat) {
        throw new Error('Please fill all required fields');
      }

      const priceExVat = Number(formData.price_ex_vat);
      const vatAmount = calculateVAT(priceExVat);
      const totalPrice = calculateTotalPrice(priceExVat);

      const ingredientData = {
        name: formData.name,
        weight: Number(formData.weight),
        unit: formData.unit,
        price_ex_vat: priceExVat,
        vat_amount: vatAmount,
        total_price: totalPrice,
        supplier: formData.supplier || null,
        quantity: `${formData.weight} ${formData.unit}` // Set quantity as a string combining weight and unit
      };

      if (editingId) {
        // Update existing ingredient
        const { error } = await supabase
          .from('ingredients')
          .update(ingredientData)
          .eq('id', editingId);
        
        if (error) throw error;
      } else {
        // Add new ingredient
        const { error } = await supabase
          .from('ingredients')
          .insert(ingredientData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setFormData({
        name: '',
        weight: '',
        unit: 'kg',
        price_ex_vat: '',
        supplier: ''
      });
      setEditingId(null);
      toast(editingId ? "Ingredient updated successfully!" : "Ingredient added successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Delete Ingredient
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

  // Handle edit
  const handleEdit = (ingredient: Ingredient) => {
    setFormData({
      name: ingredient.name,
      weight: ingredient.weight.toString(),
      unit: ingredient.unit,
      price_ex_vat: ingredient.price_ex_vat.toString(),
      supplier: ingredient.supplier || ''
    });
    setEditingId(ingredient.id);
  };

  // Cancel edit
  const handleCancel = () => {
    setFormData({
      name: '',
      weight: '',
      unit: 'kg',
      price_ex_vat: '',
      supplier: ''
    });
    setEditingId(null);
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <h1 className="text-2xl font-bold">Ingredients Management</h1>
      
      {/* Add/Edit Ingredient Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Ingredient' : 'Add New Ingredient'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium">Ingredient Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter ingredient name"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Weight</label>
              <Input
                type="number"
                step="0.01"
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: e.target.value})}
                placeholder="Enter weight"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Unit</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="units">units</option>
              </select>
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Price (Ex VAT)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.price_ex_vat}
                onChange={(e) => setFormData({...formData, price_ex_vat: e.target.value})}
                placeholder="Enter price excluding VAT"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Supplier (Optional)</label>
              <Input
                value={formData.supplier}
                onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                placeholder="Enter supplier name"
              />
            </div>
            
            {/* Price Preview */}
            {formData.price_ex_vat && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">Price Preview:</p>
                <p className="text-sm">Ex VAT: R{Number(formData.price_ex_vat).toFixed(2)}</p>
                <p className="text-sm">VAT (14%): R{calculateVAT(Number(formData.price_ex_vat)).toFixed(2)}</p>
                <p className="text-sm font-bold">Total: R{calculateTotalPrice(Number(formData.price_ex_vat)).toFixed(2)}</p>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => saveIngredient.mutate()}
              disabled={saveIngredient.isPending}
            >
              {saveIngredient.isPending ? (editingId ? "Updating..." : "Adding...") : (editingId ? "Update Ingredient" : "Add Ingredient")}
            </Button>
            
            {editingId && (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Ingredients List */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredients List</CardTitle>
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
                  <TableHead>Price Ex VAT</TableHead>
                  <TableHead>VAT (14%)</TableHead>
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
                    <TableCell>R{ingredient.price_ex_vat.toFixed(2)}</TableCell>
                    <TableCell>R{ingredient.vat_amount.toFixed(2)}</TableCell>
                    <TableCell className="font-bold">R{ingredient.total_price.toFixed(2)}</TableCell>
                    <TableCell>{ingredient.supplier || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(ingredient)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500">No ingredients found. Add your first ingredient above.</p>
          )}
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default IngredientsPage;
