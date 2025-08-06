
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
interface Product {
  id: string;
  name: string;
  code: string;
  created_at?: string;
}

const ProductsPage = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: '',
    code: ''
  });

  const {
    showSimilarityWarning,
    similarItems,
    checkSimilarity,
    proceedWithAction,
    resetSimilarityCheck
  } = useSimilarityCheck();

  // Fetch products - sorted by name
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    }
  });

  // Add/update product mutation
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      resetForm();
      toast.success(isEditing ? "Product updated successfully!" : "Product added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete product mutation with foreign key constraint handling
  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      // First check if product is referenced in production_batches
      const { data: productionBatches, error: checkError } = await supabase
        .from('production_batches')
        .select('id')
        .eq('product_id', productId)
        .limit(1);

      if (checkError) throw checkError;

      if (productionBatches && productionBatches.length > 0) {
        throw new Error('Cannot delete product: It is being used in production batches. Please remove it from production records first.');
      }

      // Check if product is referenced in expired_items
      const { data: expiredItems, error: expiredError } = await supabase
        .from('expired_items')
        .select('id')
        .eq('product_id', productId)
        .limit(1);

      if (expiredError) throw expiredError;

      if (expiredItems && expiredItems.length > 0) {
        throw new Error('Cannot delete product: It is referenced in expired items records. Please remove those references first.');
      }

      // If no references found, proceed with deletion
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success("Product deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentProduct.name || !currentProduct.code) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (!isEditing) {
      // Check for similar products for new items with 30% threshold
      const existingItems = products.map(prod => ({ 
        id: prod.id, 
        name: prod.name, 
        code: prod.code 
      }));
      
      const canProceed = checkSimilarity(
        currentProduct.name,
        currentProduct.code,
        existingItems,
        () => upsertProduct.mutate(currentProduct),
        0.3 // Set threshold to 30%
      );
      
      if (canProceed) {
        upsertProduct.mutate(currentProduct);
      }
    } else {
      upsertProduct.mutate(currentProduct);
    }
  };

  const handleEdit = (product: Product) => {
    setIsEditing(true);
    setCurrentProduct(product);
  };

  const handleDelete = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product? This will also check for any related production records.')) {
      deleteProduct.mutate(productId);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentProduct({
      name: '',
      code: ''
    });
  };

  if (showSimilarityWarning) {
    return (
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold">Products Management</h1>
        <SimilarityWarning
          newName={currentProduct.name || ''}
          newCode={currentProduct.code}
          similarItems={similarItems}
          itemType="product"
          onProceed={proceedWithAction}
          onCancel={resetSimilarityCheck}
          isLoading={upsertProduct.isPending}
        />
        <Navigation />
      </div>
    );
  }

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
                placeholder="Product Code"
                value={currentProduct.code || ''}
                onChange={(e) => setCurrentProduct({...currentProduct, code: e.target.value})}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={upsertProduct.isPending}>
                <Plus className="h-4 w-4 mr-2" />
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
          <CardTitle>Products List ({products.length} products)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading products...</div>
          ) : products.length > 0 ? (
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
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.code}</TableCell>
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
