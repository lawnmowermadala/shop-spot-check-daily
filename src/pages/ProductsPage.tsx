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
  category: string;
  batch_size: string;
  ingredients: string;
  created_at?: string;
}

const ProductsPage = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: '',
    category: '',
    batch_size: '',
    ingredients: ''
  });

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
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

  // Add/update product mutation
  const upsertProduct = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      if (!product.name || !product.category) {
        throw new Error('Name and category are required');
      }
      
      const { data, error } = isEditing && product.id
        ? await supabase
            .from('products')
            .update({
              name: product.name,
              category: product.category,
              batch_size: product.batch_size,
              ingredients: product.ingredients
            })
            .eq('id', product.id)
            .select()
        : await supabase
            .from('products')
            .insert([{
              name: product.name,
              category: product.category,
              batch_size: product.batch_size,
              ingredients: product.ingredients
            }])
            .select();
      
      if (error) throw error;
      return data?.[0] as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      resetForm();
      toast(isEditing ? "Product updated successfully!" : "Product added successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  // Delete product mutation
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
      toast("Product deleted successfully!");
    },
    onError: (error: Error) => {
      toast(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertProduct.mutate(currentProduct);
  };

  const handleEdit = (product: Product) => {
    setIsEditing(true);
    setCurrentProduct(product);
  };

  const handleDelete = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProduct.mutate(productId);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentProduct({
      name: '',
      category: '',
      batch_size: '',
      ingredients: ''
    });
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <h1 className="text-2xl font-bold">Products Management</h1>
      
      {/* Add/Edit Product Form */}
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Product Name"
                value={currentProduct.name || ''}
                onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})}
                required
              />
              <Input
                placeholder="Category"
                value={currentProduct.category || ''}
                onChange={(e) => setCurrentProduct({...currentProduct, category: e.target.value})}
                required
              />
              <Input
                placeholder="Batch Size"
                value={currentProduct.batch_size || ''}
                onChange={(e) => setCurrentProduct({...currentProduct, batch_size: e.target.value})}
              />
              <Input
                placeholder="Ingredients (comma separated)"
                value={currentProduct.ingredients || ''}
                onChange={(e) => setCurrentProduct({...currentProduct, ingredients: e.target.value})}
                className="md:col-span-2"
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
                  onClick={resetForm}
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
          {isLoading ? (
            <div className="text-center py-4">Loading products...</div>
          ) : products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Batch Size</TableHead>
                  <TableHead>Ingredients</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.batch_size || '-'}</TableCell>
                    <TableCell>
                      {product.ingredients ? (
                        <div className="flex flex-wrap gap-1">
                          {product.ingredients.split(',').map((ingredient, i) => (
                            <span key={i} className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {ingredient.trim()}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(product.id)}
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
