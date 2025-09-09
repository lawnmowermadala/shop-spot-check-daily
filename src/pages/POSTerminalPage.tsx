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
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, DollarSign, Receipt, Search } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";
import Navigation from "@/components/Navigation";

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
}

const POSTerminalPage = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const queryClient = useQueryClient();

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Product[];
    },
  });

  // Filter products by search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
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
        unit_price: 10.00, // Default price - you might want to add price to products table
        line_total: 10.00,
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto p-4">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Product Selection */}
          <div className="flex-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Product Selection
                </CardTitle>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Dialog open={showScanner} onOpenChange={setShowScanner}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Scan Barcode</Button>
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
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="cursor-pointer hover:bg-gray-50" onClick={() => addToCart(product)}>
                      <CardContent className="p-3 text-center">
                        <h3 className="font-medium text-sm">{product.name}</h3>
                        <p className="text-xs text-gray-500">{product.code}</p>
                        <p className="text-sm font-bold text-green-600 mt-1">R10.00</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shopping Cart */}
          <div className="lg:w-96">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cart.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Customer Name */}
                <Input
                  placeholder="Customer name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mb-4"
                />

                {/* Cart Items */}
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <p className="text-xs text-gray-500">R{item.unit_price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <Separator className="my-3" />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>R{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VAT (15%):</span>
                    <span>R{taxAmount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>R{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={clearCart} className="flex-1">
                    Clear
                  </Button>
                  <Dialog open={showPayment} onOpenChange={setShowPayment}>
                    <DialogTrigger asChild>
                      <Button className="flex-1" disabled={cart.length === 0}>
                        <CreditCard className="h-4 w-4 mr-1" />
                        Pay
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default POSTerminalPage;