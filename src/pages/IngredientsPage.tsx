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
    includes_vat: false,  // VAT inclusion flag
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

  // Calculate prices based on VAT inclusion
  const calculatePrices = (price: number, includesVat: boolean) => {
    if (includesVat) {
      const priceExVat = price / 1.14;
      const vatAmount = price - priceExVat;
      return {
        price_ex_vat: priceExVat,
        vat_amount: vatAmount,
        total_price: price
      };
    } else {
      const vatAmount = price * 0.14;
      const totalPrice = price + vatAmount;
      return {
        price_ex_vat: price,
        vat_amount: vatAmount,
        total_price: totalPrice
      };
    }
  };

  // Add/Update Ingredient
  const saveIngredient = useMutation({
    mutationFn: async () => {
      if (!formData.name || !formData.weight || !formData.price_ex_vat) {
        throw new Error('Please fill all required fields');
      }

      const price = Number(formData.price_ex_vat);
      const { price_ex_vat, vat_amount, total_price } = calculatePrices(
        price,
        formData.includes_vat
      );

      const ingredientData = {
        name: formData.name,
        weight: Number(formData.weight),
        unit: formData.unit,
        price_ex_vat,
        vat_amount,
        total_price,
        supplier: formData.supplier || null,
        quantity: `${formData.weight} ${formData.unit}`
      };

      if (editingId) {
        const { error } = await supabase
          .from('ingredients')
          .update(ingredientData)
          .eq('id', editingId);
        
        if (error) throw error;
      } else {
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
        includes_vat: false,
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
      includes_vat: false, // Always show as ex VAT when editing
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
      includes_vat: false,
      supplier: ''
    });
    setEditingId(null);
  };

  // Calculate preview prices
  const getPreviewPrices = () => {
    if (!formData.price_ex_vat) return null;
    
    const price = Number(formData.price_ex_vat);
    if (formData.includes_vat) {
      const exVat = price / 1.14;
      const vat = price - exVat;
      return {
        exVat,
        vat,
        total: price
      };
    } else {
      const vat = price * 0.14;
      const total = price + vat;
      return {
        exVat: price,
        vat,
        total
      };
    }
  };

  const previewPrices = getPreviewPrices();

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
              <label className="block mb-1 text-sm font-medium">Ingredient Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter ingredient name"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Weight *</label>
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
                className="w-full p-2 border rounded-md bg-white"
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
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium">
                  Price {formData.includes_vat ? '(Inc VAT)' : '(Ex VAT)'} *
                </label>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium" htmlFor="vat-toggle">
                    Includes VAT
                  </label>
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.includes_vat 
                        ? 'bg-green-500' 
                        : 'bg-gray-300'
                    }`}
                    onClick={() => setFormData({
                      ...formData,
                      includes_vat: !formData.includes_vat
                    })}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.includes_vat 
                          ? 'translate-x-6' 
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <Input
                type="number"
                step="0.01"
                value={formData.price_ex_vat}
                onChange={(e) => setFormData({
                  ...formData, 
                  price_ex_vat: e.target.value
                })}
                placeholder={
                  formData.includes_vat 
                    ? "Enter price including VAT" 
                    : "Enter price excluding VAT"
                }
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm font-medium">Supplier</label>
              <Input
                value={formData.supplier}
                onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                placeholder="Enter supplier name (optional)"
              />
            </div>
            
            {/* Price Preview */}
            {previewPrices && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600 font-medium mb-1">
                  Price Preview:
                </p>
                {formData.includes_vat ? (
                  <>
                    <p className="text-sm">
                      Inc VAT: R{Number(formData.price_ex_vat).toFixed(2)}
                    </p>
                    <p className="text-sm">
                      VAT (14%): R{previewPrices.vat.toFixed(2)}
                    </p>
                    <p className="text-sm">
                      Ex VAT: R{previewPrices.exVat.toFixed(2)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm">
                      Ex VAT: R{Number(formData.price_ex_vat).toFixed(2)}
                    </p>
                    <p className="text-sm">
                      VAT (14%): R{previewPrices.vat.toFixed(2)}
                    </p>
                    <p className="text-sm font-bold text-green-600">
                      Total: R{previewPrices.total.toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => saveIngredient.mutate()}
              disabled={saveIngredient.isPending}
              className="bg-green-600 hover:bg-green-700"
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
          <CardTitle>Ingredients List ({ingredients.length} items)</CardTitle>
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
                      <TableCell className="font-bold text-green-600">R{ingredient.total_price.toFixed(2)}</TableCell>
                      <TableCell>{ingredient.supplier || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-800"
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
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No ingredients found.</p>
              <p className="text-sm">Add your first ingredient using the form above.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default IngredientsPage;
