import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/DateRangePicker";
import { BarChart3, DollarSign, ShoppingCart, TrendingUp, FileText } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import Navigation from "@/components/Navigation";

interface SalesTransaction {
  id: string;
  transaction_number: string;
  customer_name?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  transaction_date: string;
  items?: SalesTransactionItem[];
}

interface SalesTransactionItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

const SalesReportsPage = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch sales transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['sales_transactions', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('sales_transactions')
        .select(`
          *,
          sales_transaction_items(
            product_name,
            quantity,
            unit_price,
            line_total
          )
        `)
        .order('transaction_date', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('transaction_date', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('transaction_date', dateRange.to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalesTransaction[];
    },
  });

  // Filter transactions by search term
  const filteredTransactions = transactions.filter(transaction =>
    transaction.transaction_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (transaction.customer_name && transaction.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate summary statistics
  const totalSales = filteredTransactions.reduce((sum, tx) => sum + tx.total_amount, 0);
  const totalTransactions = filteredTransactions.length;
  const averageSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;
  const totalTax = filteredTransactions.reduce((sum, tx) => sum + tx.tax_amount, 0);

  // Payment method breakdown
  const paymentMethodStats = filteredTransactions.reduce((acc, tx) => {
    acc[tx.payment_method] = (acc[tx.payment_method] || 0) + tx.total_amount;
    return acc;
  }, {} as Record<string, number>);

  // Print report function
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Sales Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .summary { background-color: #f9f9f9; padding: 15px; margin-bottom: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              @media print { button { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Sales Report</h1>
              <p>Generated on: ${format(new Date(), 'PPP')}</p>
              ${dateRange?.from ? `<p>Period: ${format(dateRange.from, 'PPP')} to ${dateRange?.to ? format(dateRange.to, 'PPP') : 'Now'}</p>` : ''}
            </div>
            
            <div class="summary">
              <h2>Summary</h2>
              <p><strong>Total Sales:</strong> R${totalSales.toFixed(2)}</p>
              <p><strong>Total Transactions:</strong> ${totalTransactions}</p>
              <p><strong>Average Sale:</strong> R${averageSale.toFixed(2)}</p>
              <p><strong>Total Tax Collected:</strong> R${totalTax.toFixed(2)}</p>
            </div>

            <h2>Transactions</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>Tax</th>
                  <th>Total</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                ${filteredTransactions.map(tx => `
                  <tr>
                    <td>${format(new Date(tx.transaction_date), 'PPp')}</td>
                    <td>${tx.transaction_number}</td>
                    <td>${tx.customer_name || 'Walk-in'}</td>
                    <td>${tx.items?.length || 0}</td>
                    <td>R${tx.subtotal.toFixed(2)}</td>
                    <td>R${tx.tax_amount.toFixed(2)}</td>
                    <td>R${tx.total_amount.toFixed(2)}</td>
                    <td>${tx.payment_method.toUpperCase()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Sales Reports</h1>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              className="w-full sm:w-auto"
            />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64"
            />
            <Button onClick={handlePrintReport} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R{totalSales.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTransactions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R{averageSale.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tax Collected</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R{totalTax.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Breakdown */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(paymentMethodStats).map(([method, amount]) => (
                  <div key={method} className="text-center">
                    <Badge variant="secondary" className="mb-2">
                      {method.toUpperCase()}
                    </Badge>
                    <div className="text-lg font-semibold">R{amount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading transactions...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Transaction #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {format(new Date(transaction.transaction_date), 'MMM dd, HH:mm')}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {transaction.transaction_number}
                          </TableCell>
                          <TableCell>
                            {transaction.customer_name || (
                              <span className="text-gray-500">Walk-in</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {transaction.items?.length || 0} items
                          </TableCell>
                          <TableCell className="font-medium">
                            R{transaction.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              transaction.payment_method === 'cash' ? 'default' :
                              transaction.payment_method === 'card' ? 'secondary' : 'outline'
                            }>
                              {transaction.payment_method.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {filteredTransactions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No transactions found for the selected period
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

export default SalesReportsPage;