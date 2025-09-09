import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DollarSign, Plus, Minus, Calculator, FileText, Clock } from "lucide-react";
import { format } from "date-fns";
import Navigation from "@/components/Navigation";

interface CashTransaction {
  id: string;
  type: 'opening' | 'closing' | 'payout' | 'payin';
  amount: number;
  reason?: string;
  cashier_name: string;
  created_at: string;
}

const CashRegisterPage = () => {
  const [openingAmount, setOpeningAmount] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutReason, setPayoutReason] = useState('');
  const [payinAmount, setPayinAmount] = useState('');
  const [payinReason, setPayinReason] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [showPayin, setShowPayin] = useState(false);
  const queryClient = useQueryClient();

  // Get today's cash sales from transactions
  const { data: todaySales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['today_sales'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('sales_transactions')
        .select('*')
        .eq('payment_method', 'cash')
        .gte('transaction_date', today.toISOString())
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate cash totals
  const totalCashSales = todaySales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const salesCount = todaySales.length;

  // Mock cash register operations (you would store these in a cash_register_operations table)
  const [cashOperations] = useState<CashTransaction[]>([]);

  // Cash register mutations
  const openRegisterMutation = useMutation({
    mutationFn: async () => {
      // In a real app, you'd store this in a cash_register_operations table
      toast.success(`Cash register opened with R${parseFloat(openingAmount).toFixed(2)}`);
      return { amount: parseFloat(openingAmount) };
    },
    onSuccess: () => {
      setOpeningAmount('');
      setShowOpenRegister(false);
      queryClient.invalidateQueries({ queryKey: ['cash_operations'] });
    },
  });

  const closeRegisterMutation = useMutation({
    mutationFn: async (closingAmount: number) => {
      // Calculate expected vs actual
      const expected = parseFloat(openingAmount || '0') + totalCashSales;
      const difference = closingAmount - expected;
      
      toast.success(`Register closed. Difference: R${difference.toFixed(2)}`);
      return { expected, actual: closingAmount, difference };
    },
    onSuccess: () => {
      setShowCloseRegister(false);
    },
  });

  const cashPayoutMutation = useMutation({
    mutationFn: async () => {
      toast.success(`Cash payout of R${parseFloat(payoutAmount).toFixed(2)} recorded`);
      return { amount: parseFloat(payoutAmount), reason: payoutReason };
    },
    onSuccess: () => {
      setPayoutAmount('');
      setPayoutReason('');
      setShowPayout(false);
    },
  });

  const cashPayinMutation = useMutation({
    mutationFn: async () => {
      toast.success(`Cash pay-in of R${parseFloat(payinAmount).toFixed(2)} recorded`);
      return { amount: parseFloat(payinAmount), reason: payinReason };
    },
    onSuccess: () => {
      setPayinAmount('');
      setPayinReason('');
      setShowPayin(false);
    },
  });

  const handleOpenRegister = () => {
    if (!cashierName || !openingAmount) {
      toast.error('Please enter cashier name and opening amount');
      return;
    }
    openRegisterMutation.mutate();
  };

  const handleCloseRegister = (closingAmount: string) => {
    if (!closingAmount) {
      toast.error('Please enter closing amount');
      return;
    }
    closeRegisterMutation.mutate(parseFloat(closingAmount));
  };

  const handlePayout = () => {
    if (!payoutAmount || !payoutReason) {
      toast.error('Please enter amount and reason for payout');
      return;
    }
    cashPayoutMutation.mutate();
  };

  const handlePayin = () => {
    if (!payinAmount || !payinReason) {
      toast.error('Please enter amount and reason for pay-in');
      return;
    }
    cashPayinMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Cash Register Management</h1>
          
          {/* Cashier Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Current Shift
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <Input
                  placeholder="Cashier name"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="max-w-xs"
                />
                <Badge variant="outline">
                  Shift: {format(new Date(), 'PPP')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Cash Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Opening Float</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R{parseFloat(openingAmount || '0').toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Sales</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R{totalCashSales.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{salesCount} transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expected Total</CardTitle>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R{(parseFloat(openingAmount || '0') + totalCashSales).toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={openingAmount ? 'default' : 'secondary'}>
                  {openingAmount ? 'Open' : 'Closed'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Dialog open={showOpenRegister} onOpenChange={setShowOpenRegister}>
              <DialogTrigger asChild>
                <Button className="w-full" disabled={!!openingAmount}>
                  <Plus className="h-4 w-4 mr-2" />
                  Open Register
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Open Cash Register</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Opening amount"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                  />
                  <Button onClick={handleOpenRegister} className="w-full">
                    Open Register
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showCloseRegister} onOpenChange={setShowCloseRegister}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={!openingAmount}>
                  <Minus className="h-4 w-4 mr-2" />
                  Close Register
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Close Cash Register</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-sm space-y-2">
                    <p>Opening Amount: R{parseFloat(openingAmount || '0').toFixed(2)}</p>
                    <p>Cash Sales: R{totalCashSales.toFixed(2)}</p>
                    <p className="font-bold">Expected Total: R{(parseFloat(openingAmount || '0') + totalCashSales).toFixed(2)}</p>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Actual closing amount"
                    onChange={(e) => handleCloseRegister(e.target.value)}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showPayout} onOpenChange={setShowPayout}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Minus className="h-4 w-4 mr-2" />
                  Cash Payout
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Cash Payout</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Payout amount"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                  />
                  <Input
                    placeholder="Reason for payout"
                    value={payoutReason}
                    onChange={(e) => setPayoutReason(e.target.value)}
                  />
                  <Button onClick={handlePayout} className="w-full">
                    Record Payout
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showPayin} onOpenChange={setShowPayin}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Cash Pay-in
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Cash Pay-in</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Pay-in amount"
                    value={payinAmount}
                    onChange={(e) => setPayinAmount(e.target.value)}
                  />
                  <Input
                    placeholder="Reason for pay-in"
                    value={payinReason}
                    onChange={(e) => setPayinReason(e.target.value)}
                  />
                  <Button onClick={handlePayin} className="w-full">
                    Record Pay-in
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Recent Cash Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Cash Sales</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSales ? (
                <div className="text-center py-8">Loading sales...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Transaction #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todaySales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            {format(new Date(sale.transaction_date), 'HH:mm')}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {sale.transaction_number}
                          </TableCell>
                          <TableCell>
                            {sale.customer_name || <span className="text-gray-500">Walk-in</span>}
                          </TableCell>
                          <TableCell className="font-medium">
                            R{sale.total_amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {todaySales.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No cash sales today
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default CashRegisterPage;