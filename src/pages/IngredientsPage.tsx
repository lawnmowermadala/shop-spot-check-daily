
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';
import { useSimilarityCheck } from '@/hooks/useSimilarityCheck';
import SimilarityWarning from '@/components/SimilarityWarning';

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

const IngredientsPage = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Similarity check hook
  const {
    showSimilarityWarning,
    similarItems,
    checkSimilarity,
    proceedWithAction,
    resetSimilarityCheck
  } = useSimilarityCheck();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    weight: '',
    unit: 'kg',
    price_ex_vat: '',
    includes_vat: false,  // VAT inclusion flag
    supplier: ''
  });

  // Unit options for dropdown
  const unitOptions = [
    { value: 'kg', label: 'kg' },
    { value: 'g', label: 'g' },
    { value: 'l', label: 'l' },
    { value: 'ml', label: 'ml' },
    { value: 'units', label: 'units' }
  ];

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

  // Function to actually save ingredient (called after similarity check)
  const performSaveIngredient = async () => {
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
  };

  // Add/Update Ingredient with similarity check
  const saveIngredient = useMutation({
    mutationFn: performSaveIngredient,
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

  // Handle save with similarity check
  const handleSave = () => {
    if (!formData.name || !formData.weight || !formData.price_ex_vat) {
      toast("Please fill all required fields");
      return;
    }

    // Skip similarity check for updates
    if (editingId) {
      saveIngredient.mutate();
      return;
    }

    // Check for similar ingredients for new items
    const existingItems = ingredients.map(ingredient => ({
      id: ingredient.id,
      name: ingredient.name
    }));

    const canProceed = checkSimilarity(
      formData.name,
      undefined, // No code field for ingredients
      existingItems,
      () => saveIngredient.mutate()
    );

    if (canProceed) {
      saveIngredient.mutate();
    }
  };

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
      
      {/* Similarity Warning */}
      {showSimilarityWarning && (
        <SimilarityWarning
          newName={formData.name}
          similarItems={similarItems}
          itemType="ingredient"
          onProceed={proceedWithAction}
          onCancel={resetSimilarityCheck}
          isLoading={saveIngredient.isPending}
        />
      )}
      
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
              <SearchableDropdown
                options={unitOptions}
                value={formData.unit}
                onChange={(value) => setFormData({...formData, unit: value})}
                placeholder="Select unit"
                searchPlaceholder="Search units..."
              />
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
              onClick={handleSave}
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
