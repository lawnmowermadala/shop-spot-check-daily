import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, DollarSign, Receipt, Search, X, Scan, BarChart3 } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";
import Navigation from "@/components/Navigation";
import { useNavigate } from 'react-router-dom';

interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  category: string;
}

const POSTerminalPage = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch products that are enabled for POS
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('show_on_pos', true)
        .order('name');
      if (error) throw error;
      return data as Product[];
    },
  });

  // Get unique categories
  const categories = [...new Set(products.map(product => product.category))].filter(Boolean);

  // Filter products by search term and category
  const filteredProducts = products.filter(product =>
    (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (activeCategory === '' || product.category === activeCategory)
  );

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.line_total, 0);
  const taxRate = 0.15; // 15% VAT
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  // Add item to cart
  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price || 10.00,
        line_total: product.price || 10.00,
      };
      setCart([...cart, newItem]);
    }
    toast.success(`Added ${product.name} to cart`);
  };

  // Update quantity
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(cart.map(item => 
      item.id === itemId 
        ? { ...item, quantity: newQuantity, line_total: item.unit_price * newQuantity }
        : item
    ));
  };

  // Remove from cart
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setAmountPaid('');
  };

  // Process sale mutation
  const processSaleMutation = useMutation({
    mutationFn: async ({ paymentData }: { paymentData: any }) => {
      // Create transaction
      const transactionNumber = `TXN-${Date.now()}`;
      const { data: transaction, error: txnError } = await supabase
        .from('sales_transactions')
        .insert({
          transaction_number: transactionNumber,
          customer_name: customerName || null,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (txnError) throw txnError;

      // Create transaction items
      const items = cart.map(item => ({
        transaction_id: transaction.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
      }));

      const { error: itemsError } = await supabase
        .from('sales_transaction_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Create payment record
      const changeGiven = Math.max(0, parseFloat(amountPaid) - total);
      const { error: paymentError } = await supabase
        .from('payment_transactions')
        .insert({
          sales_transaction_id: transaction.id,
          payment_method: paymentMethod,
          amount_paid: parseFloat(amountPaid),
          change_given: changeGiven,
        });

      if (paymentError) throw paymentError;

      return { transaction, changeGiven };
    },
    onSuccess: (data) => {
      toast.success(`Sale completed! Transaction: ${data.transaction.transaction_number}`);
      if (data.changeGiven > 0) {
        toast.info(`Change due: R${data.changeGiven.toFixed(2)}`);
      }
      clearCart();
      setShowPayment(false);
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
    onError: (error) => {
      console.error('Sale processing error:', error);
      toast.error('Failed to process sale');
    },
  });

  const handleProcessSale = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    
    if (paymentMethod === 'cash') {
      const paid = parseFloat(amountPaid);
      if (!paid || paid < total) {
        toast.error('Insufficient payment amount');
        return;
      }
    }

    processSaleMutation.mutate({
      paymentData: { method: paymentMethod, amount: parseFloat(amountPaid) }
    });
  };

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(p => p.code === barcode);
    if (product) {
      addToCart(product);
      setShowScanner(false);
    } else {
      toast.error('Product not found');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="container mx-auto p-4">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Product Selection */}
          <div className="flex-1">
            <Card>
              <CardHeader className="bg-blue-600 text-white">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-center text-2xl">TEST RETAIL POS</CardTitle>
                  <Button 
                    variant="outline" 
                    className="bg-white text-blue-600 hover:bg-gray-100"
                    onClick={() => navigate('/stock-information')}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Stock Info
                  </Button>
                </div>
                <div className="flex gap-2 mt-4">
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 bg-white"
                  />
                  <Dialog open={showScanner} onOpenChange={setShowScanner}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="bg-white">
                        <Scan className="h-4 w-4 mr-1" />
                        Scan
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Scan Product Barcode</DialogTitle>
                      </DialogHeader>
                      <BarcodeScanner onScan={handleBarcodeScanned} />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                {/* Category Buttons */}
                <div className="flex flex-wrap gap-1 mb-4">
                  <Button 
                    variant={activeCategory === '' ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setActiveCategory('')}
                    className="text-xs"
                  >
                    All
                  </Button>
                  {categories.map(category => (
                    <Button 
                      key={category} 
                      variant={activeCategory === category ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setActiveCategory(category)}
                      className="text-xs"
                    >
                      {category}
                    </Button>
                  ))}
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="cursor-pointer hover:bg-gray-50" onClick={() => addToCart(product)}>
                      <CardContent className="p-2 text-center">
                        <h3 className="font-medium text-xs h-10 overflow-hidden">{product.name}</h3>
                        <p className="text-[10px] text-gray-500">{product.code}</p>
                        <p className="text-sm font-bold text-green-600 mt-1">R{product.price?.toFixed(2) || '10.00'}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shopping Cart */}
          <div className="lg:w-96">
            <Card className="h-full">
              <CardHeader className="bg-gray-800 text-white py-2">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>Cart</span>
                  <Badge variant="secondary">{cart.length} items</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {/* Transaction Details */}
                <div className="bg-white p-3 rounded mb-3">
                  <div className="text-center text-2xl font-bold mb-2">R{total.toFixed(2)}</div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Change:</span>
                    <span>R0.00</span>
                  </div>
                  <Separator className="my-2" />
                  
                  {/* Cart Items */}
                  <div className="max-h-40 overflow-y-auto mb-2">
                    {cart.length === 0 ? (
                      <p className="text-center text-gray-500 text-sm py-4">No items in cart</p>
                    ) : (
                      cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-center py-1 text-sm">
                          <div className="flex-1">
                            <p className="font-medium truncate">{item.product_name}</p>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Qty: {item.quantity}</span>
                              <span>R{item.unit_price.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold">R{item.line_total.toFixed(2)}</span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-5 w-5 p-0" 
                              onClick={() => removeFromCart(item.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <Separator className="my-2" />
                  
                  {/* Totals */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>R{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT (15%):</span>
                      <span>R{taxAmount.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>R{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Section */}
                <div className="bg-white p-3 rounded mb-3">
                  <div className="text-sm font-medium mb-2">Amount Inserted: R{amountPaid || '0.00'}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={clearCart}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => setShowPayment(true)} 
                      disabled={cart.length === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Pay
                    </Button>
                  </div>
                </div>

                {/* Customer Name */}
                <Input
                  placeholder="Customer name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mb-3 bg-white"
                />

                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'C'].map((key) => (
                    <Button
                      key={key}
                      variant="outline"
                      className="h-12 bg-white"
                      onClick={() => {
                        if (key === 'C') {
                          setAmountPaid('');
                        } else if (key === '.') {
                          if (!amountPaid.includes('.')) {
                            setAmountPaid(amountPaid + '.');
                          }
                        } else {
                          setAmountPaid(amountPaid + key.toString());
                        }
                      }}
                    >
                      {key}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="eft">EFT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Amount Paid</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total Due:</span>
              <span>R{total.toFixed(2)}</span>
            </div>
            {paymentMethod === 'cash' && amountPaid && parseFloat(amountPaid) > total && (
              <div className="flex justify-between text-green-600">
                <span>Change:</span>
                <span>R{(parseFloat(amountPaid) - total).toFixed(2)}</span>
              </div>
            )}
            <Button 
              onClick={handleProcessSale} 
              className="w-full"
              disabled={processSaleMutation.isPending}
            >
              {processSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default POSTerminalPage;
