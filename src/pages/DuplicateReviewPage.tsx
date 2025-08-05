
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { findSimilarItems } from '@/utils/similarityCheck';
import Navigation from '@/components/Navigation';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  weight: number;
  unit: string;
  price_ex_vat: number;
  total_price: number;
}

interface Product {
  id: string;
  name: string;
  code: string;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  batch_size: number;
  unit: string;
}

interface SimilarGroup {
  mainItem: any;
  similarItems: Array<{ id: string; name: string; similarity: number }>;
}

const DuplicateReviewPage = () => {
  const [selectedTab, setSelectedTab] = useState('ingredients');

  // Fetch all data
  const { data: ingredients = [] } = useQuery({
    queryKey: ['all-ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Ingredient[];
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Product[];
    }
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['all-recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Recipe[];
    }
  });

  // Function to find similar groups
  const findSimilarGroups = (items: any[], threshold = 0.7): SimilarGroup[] => {
    const groups: SimilarGroup[] = [];
    const processedIds = new Set<string>();

    items.forEach(item => {
      if (processedIds.has(item.id)) return;

      const similarItems = findSimilarItems(
        item.name,
        items.filter(i => i.id !== item.id),
        threshold
      );

      if (similarItems.length > 0) {
        groups.push({
          mainItem: item,
          similarItems
        });

        // Mark all similar items as processed
        processedIds.add(item.id);
        similarItems.forEach(similar => processedIds.add(similar.id));
      }
    });

    return groups;
  };

  const ingredientGroups = findSimilarGroups(ingredients);
  const productGroups = findSimilarGroups(products);
  const recipeGroups = findSimilarGroups(recipes);

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'bg-red-100 text-red-800';
    if (similarity >= 0.8) return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.9) return 'Very Similar';
    if (similarity >= 0.8) return 'Similar';
    return 'Somewhat Similar';
  };

  const renderIngredientsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <h2 className="text-lg font-semibold">
          Found {ingredientGroups.length} groups of similar ingredients
        </h2>
      </div>

      {ingredientGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-green-800">No similar ingredients found!</p>
            <p className="text-gray-600">Your ingredients list looks clean.</p>
          </CardContent>
        </Card>
      ) : (
        ingredientGroups.map((group, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Group {index + 1}: "{group.mainItem.name}"</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {group.similarItems.length + 1} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Weight/Unit</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Similarity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Main item */}
                  <TableRow className="bg-blue-50">
                    <TableCell className="font-bold">{group.mainItem.name} (Main)</TableCell>
                    <TableCell>{group.mainItem.weight} {group.mainItem.unit}</TableCell>
                    <TableCell>R{group.mainItem.total_price.toFixed(2)}</TableCell>
                    <TableCell>{group.mainItem.supplier || 'N/A'}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">Keep</Button>
                    </TableCell>
                  </TableRow>
                  {/* Similar items */}
                  {group.similarItems.map(similar => {
                    const fullItem = ingredients.find(ing => ing.id === similar.id);
                    return (
                      <TableRow key={similar.id}>
                        <TableCell>{similar.name}</TableCell>
                        <TableCell>{fullItem?.weight} {fullItem?.unit}</TableCell>
                        <TableCell>R{fullItem?.total_price.toFixed(2)}</TableCell>
                        <TableCell>{fullItem?.supplier || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={getSimilarityColor(similar.similarity)}>
                            {Math.round(similar.similarity * 100)}% - {getSimilarityLabel(similar.similarity)}
                          </Badge>
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" variant="outline" className="text-green-600">
                            Merge
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600">
                            Keep Separate
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const renderProductsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <h2 className="text-lg font-semibold">
          Found {productGroups.length} groups of similar products
        </h2>
      </div>

      {productGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-green-800">No similar products found!</p>
            <p className="text-gray-600">Your products list looks clean.</p>
          </CardContent>
        </Card>
      ) : (
        productGroups.map((group, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Group {index + 1}: "{group.mainItem.name}"</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {group.similarItems.length + 1} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Similarity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Main item */}
                  <TableRow className="bg-blue-50">
                    <TableCell className="font-bold">{group.mainItem.name} (Main)</TableCell>
                    <TableCell>{group.mainItem.code}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">Keep</Button>
                    </TableCell>
                  </TableRow>
                  {/* Similar items */}
                  {group.similarItems.map(similar => {
                    const fullItem = products.find(prod => prod.id === similar.id);
                    return (
                      <TableRow key={similar.id}>
                        <TableCell>{similar.name}</TableCell>
                        <TableCell>{fullItem?.code}</TableCell>
                        <TableCell>
                          <Badge className={getSimilarityColor(similar.similarity)}>
                            {Math.round(similar.similarity * 100)}% - {getSimilarityLabel(similar.similarity)}
                          </Badge>
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" variant="outline" className="text-green-600">
                            Merge
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600">
                            Keep Separate
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const renderRecipesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <h2 className="text-lg font-semibold">
          Found {recipeGroups.length} groups of similar recipes
        </h2>
      </div>

      {recipeGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-green-800">No similar recipes found!</p>
            <p className="text-gray-600">Your recipes list looks clean.</p>
          </CardContent>
        </Card>
      ) : (
        recipeGroups.map((group, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Group {index + 1}: "{group.mainItem.name}"</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {group.similarItems.length + 1} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Batch Size</TableHead>
                    <TableHead>Similarity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Main item */}
                  <TableRow className="bg-blue-50">
                    <TableCell className="font-bold">{group.mainItem.name} (Main)</TableCell>
                    <TableCell>{group.mainItem.description || 'N/A'}</TableCell>
                    <TableCell>{group.mainItem.batch_size} {group.mainItem.unit}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">Keep</Button>
                    </TableCell>
                  </TableRow>
                  {/* Similar items */}
                  {group.similarItems.map(similar => {
                    const fullItem = recipes.find(recipe => recipe.id === similar.id);
                    return (
                      <TableRow key={similar.id}>
                        <TableCell>{similar.name}</TableCell>
                        <TableCell>{fullItem?.description || 'N/A'}</TableCell>
                        <TableCell>{fullItem?.batch_size} {fullItem?.unit}</TableCell>
                        <TableCell>
                          <Badge className={getSimilarityColor(similar.similarity)}>
                            {Math.round(similar.similarity * 100)}% - {getSimilarityLabel(similar.similarity)}
                          </Badge>
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" variant="outline" className="text-green-600">
                            Merge
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600">
                            Keep Separate
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const totalDuplicates = ingredientGroups.length + productGroups.length + recipeGroups.length;

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Duplicate Review</h1>
        <div className="flex items-center gap-2">
          {totalDuplicates > 0 ? (
            <>
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="text-orange-800 font-medium">
                {totalDuplicates} potential duplicate groups found
              </span>
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">
                No duplicates found - everything looks clean!
              </span>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ingredients" className="flex items-center gap-2">
                Ingredients 
                {ingredientGroups.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                    {ingredientGroups.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                Products
                {productGroups.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                    {productGroups.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="recipes" className="flex items-center gap-2">
                Recipes
                {recipeGroups.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                    {recipeGroups.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ingredients" className="mt-6">
              {renderIngredientsTab()}
            </TabsContent>

            <TabsContent value="products" className="mt-6">
              {renderProductsTab()}
            </TabsContent>

            <TabsContent value="recipes" className="mt-6">
              {renderRecipesTab()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Navigation />
    </div>
  );
};

export default DuplicateReviewPage;
