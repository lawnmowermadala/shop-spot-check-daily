import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';

// Types
interface Product {
  id: string;
  name: string;
  code: string;
  created_at?: string;
}

interface Ingredient {
  id: string;
  product_id: string;
  name: string;
  quantity: string;
  created_at?: string;
}

const ProductsPage = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: '',
    code: ''
  });
  const [currentIngredient, setCurrentIngredient] = useState<Omit<Ingredient, 'id' | 'created_at'>>({
    product_id: '',
    name: '',
    quantity: ''
  });
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Product[];
    }
  });

  // Fetch ingredients for active product
  const { data: ingredients = [], isLoading: ingredientsLoading } = useQuery({
    queryKey: ['ingredients', activeProductId],
    queryFn: async () => {
      if (!activeProductId) return [];
      
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('product_id', activeProductId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Ingredient[];
    },
    enabled: !!activeProductId
  });

  // Product mutations
  const upsertProduct = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      if (!product.name || !product.code) {
        throw new Error('Name and code are required');
      }
      
      const { data, error } = isEditing && product.id
        ? await supabase
            .from('products')
            .update({
              name: product.name,
              code: product.code
            })
            .eq('id', product.id)
            .select()
        : await supabase
            .from('products')
            .insert([{
              name: product.name,
              code: product.code
            }])
            .select();
      
      if (error) throw error;
      return data?.[0] as Product;
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      resetProductForm();
      toast(isEditing ? "Product updated successfully!" : "Product added successfully!");
      setActiveProductId(product.id);
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      toast("Product deleted successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Ingredient mutations
  const addIngredient = useMutation({
    mutationFn: async (ingredient: Omit<Ingredient, 'id' | 'created_at'>) => {
      if (!ingredient.product_id || !ingredient.name || !ingredient.quantity) {
        throw new Error('Product ID, name and quantity are required');
      }
      
      const { error } = await supabase
        .from('ingredients')
        .insert([ingredient]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setCurrentIngredient({
        product_id: activeProductId || '',
        name: '',
        quantity: ''
      });
      toast("Ingredient added successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

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

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertProduct.mutate(currentProduct);
  };

  const handleIngredientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProductId) return;
    addIngredient.mutate({
      ...currentIngredient,
      product_id: activeProductId
    });
  };

  const handleEditProduct = (product: Product) => {
    setIsEditing(true);
    setCurrentProduct(product);
    setActiveProductId(product.id);
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product and all its ingredients?')) {
      deleteProduct.mutate(productId);
    }
  };

  const handleDeleteIngredient = (ingredientId: string) => {
    if (window.confirm('Are you sure you want to delete this ingredient?')) {
      deleteIngredient.mutate(ingredientId);
    }
  };

  const resetProductForm = () => {
    setIsEditing(false);
    setCurrentProduct({
      name: '',
      code: ''
    });
    setActiveProductId(null);
  };

  const showIngredients = (productId: string) => {
    setActiveProductId(activeProductId === productId ? null : productId);
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <h1 className="text-2xl font-bold">Products Management</h1>
      
      {/* Product Form */}
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProductSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Product Name"
                value={currentProduct.name || ''}
                onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})}
                required
              />
              <Input
                placeholder="Product Code"
                value={currentProduct.code || ''}
                onChange={(e) => setCurrentProduct({...currentProduct, code: e.target.value})}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={upsertProduct.isPending}>
                {isEditing ? 'Update Product' : 'Add Product'}
              </Button>
              {isEditing && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={resetProductForm}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle>Products List</CardTitle>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="text-center py-4">Loading products...</div>
          ) : products.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(product => (
                    <>
                      <TableRow key={product.id} className="cursor-pointer" onClick={() => showIngredients(product.id)}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.code}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProduct(product);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProduct(product.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {activeProductId === product.id && (
                        <TableRow>
                          <TableCell colSpan={3} className="p-0">
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <h3 className="font-medium mb-2">Ingredients</h3>
                              
                              {/* Add Ingredient Form */}
                              <form onSubmit={handleIngredientSubmit} className="flex gap-2 mb-4">
                                <Input
                                  placeholder="Ingredient Name"
                                  value={currentIngredient.name}
                                  onChange={(e) => setCurrentIngredient({
                                    ...currentIngredient,
                                    name: e.target.value
                                  })}
                                  required
                                />
                                <Input
                                  placeholder="Quantity"
                                  value={currentIngredient.quantity}
                                  onChange={(e) => setCurrentIngredient({
                                    ...currentIngredient,
                                    quantity: e.target.value
                                  })}
                                  required
                                />
                                <Button type="submit" size="sm" disabled={addIngredient.isPending}>
                                  <Plus className="h-4 w-4 mr-1" /> Add
                                </Button>
                              </form>
                              
                              {/* Ingredients List */}
                              {ingredientsLoading ? (
                                <div className="text-center py-4">Loading ingredients...</div>
                              ) : ingredients.length > 0 ? (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Quantity</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {ingredients.map(ingredient => (
                                      <TableRow key={ingredient.id}>
                                        <TableCell>{ingredient.name}</TableCell>
                                        <TableCell>{ingredient.quantity}</TableCell>
                                        <TableCell className="text-right">
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 h-8 w-8"
                                            onClick={() => handleDeleteIngredient(ingredient.id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  No ingredients added yet.
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No products found. Add your first product above.
            </div>
          )}
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default ProductsPage;
