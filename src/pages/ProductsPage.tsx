import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface Product {
  id: string;
  name: string;
  category: string;
  batch_size: string;
  ingredients: string;
  created_at?: string;
}

interface ProductionLog {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  staff_id: string;
  staff_name: string;
  production_date: string;
  created_at?: string;
}

interface ExpiredItem {
  id: string;
  product_name: string;
  quantity: string;
  batch_date: string;
  removal_date: string;
  created_at?: string;
}

const ProductsPage = () => {
  // Product Management
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    batch_size: '',
    ingredients: ''
  });
  
  // Production Logging
  const [productionInput, setProductionInput] = useState({
    product_id: '',
    quantity: 0,
    staff_id: '',
    staff_name: ''
  });
  const [productionDate, setProductionDate] = useState<Date | undefined>(new Date());
  
  // Expired Items
  const [expiredItem, setExpiredItem] = useState({
    product_name: '',
    quantity: '',
    batch_date: '',
    removal_date: format(new Date(), 'yyyy-MM-dd')
  });

  // Fetch products
  const { data: products = [], refetch: refetchProducts } = useQuery({
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

  // Fetch production logs
  const { data: productionLogs = [], refetch: refetchProductionLogs } = useQuery({
    queryKey: ['production_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_logs')
        .select('*')
        .order('production_date', { ascending: false });
      
      if (error) throw error;
      return data as ProductionLog[];
    }
  });

  // Fetch expired items
  const { data: expiredItems = [], refetch: refetchExpiredItems } = useQuery({
    queryKey: ['expired_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expired_items')
        .select('*')
        .order('removal_date', { ascending: false });
      
      if (error) throw error;
      return data as ExpiredItem[];
    }
  });

  // Handle product creation
  const handleAddProduct = async () => {
    try {
      const { error } = await supabase
        .from('products')
        .insert({
          name: newProduct.name,
          category: newProduct.category,
          batch_size: newProduct.batch_size,
          ingredients: newProduct.ingredients
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product added successfully!",
      });

      setNewProduct({
        name: '',
        category: '',
        batch_size: '',
        ingredients: ''
      });
      refetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive"
      });
    }
  };

  // Handle production logging
  const handleLogProduction = async () => {
    try {
      if (!productionInput.product_id || !productionInput.quantity || !productionDate) {
        throw new Error("Please fill all required fields");
      }

      const product = products.find(p => p.id === productionInput.product_id);
      if (!product) throw new Error("Product not found");

      const { error } = await supabase
        .from('production_logs')
        .insert({
          product_id: productionInput.product_id,
          product_name: product.name,
          quantity: productionInput.quantity,
          staff_id: productionInput.staff_id,
          staff_name: productionInput.staff_name,
          production_date: productionDate.toISOString()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Production logged successfully!",
      });

      setProductionInput({
        product_id: '',
        quantity: 0,
        staff_id: '',
        staff_name: ''
      });
      refetchProductionLogs();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Handle expired item recording
  const handleAddExpiredItem = async () => {
    try {
      const { error } = await supabase
        .from('expired_items')
        .insert({
          product_name: expiredItem.product_name,
          quantity: expiredItem.quantity,
          batch_date: expiredItem.batch_date,
          removal_date: expiredItem.removal_date
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expired item recorded!",
      });

      setExpiredItem({
        product_name: '',
        quantity: '',
        batch_date: '',
        removal_date: format(new Date(), 'yyyy-MM-dd')
      });
      refetchExpiredItems();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record expired item",
        variant: "destructive"
      });
    }
  };

  // Staff login (simplified for demo)
  const handleStaffLogin = () => {
    // In a real app, this would be proper authentication
    setProductionInput(prev => ({
      ...prev,
      staff_id: 'staff_123',
      staff_name: 'Elton'
    }));
    toast({
      title: "Staff Authenticated",
      description: "Logged in as Elton",
    });
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Production Management</h1>
      
      {/* Product Creation */}
      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              placeholder="Product Name"
              value={newProduct.name}
              onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
            />
            <Input
              placeholder="Category (e.g., Bread, Pastry)"
              value={newProduct.category}
              onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
            />
            <Input
              placeholder="Batch Size"
              value={newProduct.batch_size}
              onChange={(e) => setNewProduct({...newProduct, batch_size: e.target.value})}
            />
            <Input
              placeholder="Ingredients"
              value={newProduct.ingredients}
              onChange={(e) => setNewProduct({...newProduct, ingredients: e.target.value})}
            />
          </div>
          <Button onClick={handleAddProduct}>Add Product</Button>
        </CardContent>
      </Card>

      {/* Production Logging */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Production Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <select
              className="p-2 border rounded"
              value={productionInput.product_id}
              onChange={(e) => setProductionInput({...productionInput, product_id: e.target.value})}
            >
              <option value="">Select Product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="Quantity"
              value={productionInput.quantity}
              onChange={(e) => setProductionInput({...productionInput, quantity: Number(e.target.value)})}
            />
            <div className="flex items-center gap-2">
              <Button onClick={handleStaffLogin}>Staff Login</Button>
              <span>{productionInput.staff_name || "Not logged in"}</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {productionDate ? format(productionDate, "PPP") : <span>Pick date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={productionDate}
                  onSelect={setProductionDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={handleLogProduction}>Log Production</Button>
        </CardContent>
      </Card>

      {/* Production History */}
      <Card>
        <CardHeader>
          <CardTitle>Production History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Staff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productionLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.production_date).toLocaleDateString()}</TableCell>
                  <TableCell>{log.product_name}</TableCell>
                  <TableCell>{log.quantity}</TableCell>
                  <TableCell>{log.staff_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Expired Items */}
      <Card>
        <CardHeader>
          <CardTitle>Expired Stock Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              placeholder="Product Name"
              value={expiredItem.product_name}
              onChange={(e) => setExpiredItem({...expiredItem, product_name: e.target.value})}
            />
            <Input
              placeholder="Quantity"
              value={expiredItem.quantity}
              onChange={(e) => setExpiredItem({...expiredItem, quantity: e.target.value})}
            />
            <Input
              type="date"
              placeholder="Batch Date"
              value={expiredItem.batch_date}
              onChange={(e) => setExpiredItem({...expiredItem, batch_date: e.target.value})}
            />
            <Input
              type="date"
              placeholder="Removal Date"
              value={expiredItem.removal_date}
              onChange={(e) => setExpiredItem({...expiredItem, removal_date: e.target.value})}
            />
          </div>
          <Button onClick={handleAddExpiredItem}>Record Expired Item</Button>

          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Batch Date</TableHead>
                <TableHead>Removal Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiredItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.batch_date}</TableCell>
                  <TableCell>{item.removal_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsPage;
