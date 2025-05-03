import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { BarChart, XAxis, YAxis, Bar, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, Trophy, AlertTriangle } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Analytics = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });

  // Fetch ratings data
  const { data: ratings = [], isLoading: ratingsLoading, error: ratingsError } = useQuery({
    queryKey: ['ratings-analytics', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.from('ratings').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch assignments data
  const { data: assignments = [], isLoading: assignmentsLoading, error: assignmentsError } = useQuery({
    queryKey: ['assignments-analytics', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.from('assignments').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  useEffect(() => {
    if (ratingsError || assignmentsError) {
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    }
  }, [ratingsError, assignmentsError]);

  // Filter data by date range
  const filterByDate = (items: any[], dateField: string) => {
    if (!dateRange?.from && !dateRange?.to) return items;
    
    return items.filter(item => {
      const itemDate = parseISO(item[dateField]);
      if (!itemDate) return false;
      
      if (dateRange?.from && dateRange?.to) {
        return isAfter(itemDate, startOfDay(dateRange.from)) && 
               isBefore(itemDate, endOfDay(dateRange.to));
      }
      
      if (dateRange?.from) return isAfter(itemDate, startOfDay(dateRange.from));
      if (dateRange?.to) return isBefore(itemDate, endOfDay(dateRange.to));
      
      return true;
    });
  };

  const filteredRatings = filterByDate(ratings, 'rating_date');
  const filteredAssignments = filterByDate(assignments, 'created_at');

  // Process staff ratings (sorted best to worst)
  const staffPerformance = Object.entries(
    filteredRatings.reduce((acc: Record<string, any>, rating) => {
      if (!acc[rating.staff_name]) {
        acc[rating.staff_name] = {
          name: rating.staff_name,
          overall: 0,
          count: 0
        };
      }
      acc[rating.staff_name].overall += rating.overall;
      acc[rating.staff_name].count += 1;
      return acc;
    }, {})
  ).map(([_, data]) => ({
    name: data.name,
    averageRating: +(data.overall / data.count).toFixed(1),
    totalRatings: data.count
  }))
  .sort((a, b) => b.averageRating - a.averageRating);

  // Process area completion data
  const areaCompletion = Object.entries(
    filteredAssignments.reduce((acc: Record<string, number>, assignment) => {
      const area = assignment.area;
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {})
  ).map(([area, count]) => ({
    area,
    count
  }))
  .sort((a, b) => b.count - a.count);

  // Get top 3 performing areas
  const topAreas = areaCompletion.slice(0, 3);
  // Get bottom 3 performing areas (neglected)
  const neglectedAreas = areaCompletion.slice(-3).reverse();

  const isLoading = ratingsLoading || assignmentsLoading;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Employee Performance Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1, h2 { color: #333; }
              .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
              .date-range { font-style: italic; color: #666; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .top-performer { background-color: #e6f7e6; }
              .top-area { background-color: #e6f3ff; }
              .neglected-area { background-color: #ffebeb; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Employee Performance Report</h1>
              <div class="date-range">
                ${dateRange?.from && dateRange?.to ? 
                  `Period: ${format(dateRange.from, 'PP')} to ${format(dateRange.to, 'PP')}` : 
                  'All time data'}
              </div>
            </div>

            <h2>Employee of the Month Candidates</h2>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Employee</th>
                  <th>Average Rating</th>
                  <th>Total Ratings</th>
                </tr>
              </thead>
              <tbody>
                ${staffPerformance.slice(0, 5).map((staff, index) => `
                  <tr class="${index === 0 ? 'top-performer' : ''}">
                    <td>${index + 1}</td>
                    <td>${staff.name}</td>
                    <td>${staff.averageRating}</td>
                    <td>${staff.totalRatings}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <h2>Top Performing Areas</h2>
            <table>
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Completed Tasks</th>
                </tr>
              </thead>
              <tbody>
                ${topAreas.map((area, index) => `
                  <tr class="top-area">
                    <td>${area.area}</td>
                    <td>${area.count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <h2>Neglected Areas Needing Attention</h2>
            <table>
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Completed Tasks</th>
                </tr>
              </thead>
              <tbody>
                ${neglectedAreas.map(area => `
                  <tr class="neglected-area">
                    <td>${area.area}</td>
                    <td>${area.count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 200);
    }
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employee Performance Analytics</h1>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Generate Report
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangePicker 
            dateRange={dateRange} 
            onDateRangeChange={setDateRange} 
            className="w-full max-w-sm" 
          />
          <div className="text-sm text-muted-foreground mt-2">
            {dateRange?.from && dateRange?.to ? (
              <p>Showing data from {format(dateRange.from, 'PP')} to {format(dateRange.to, 'PP')}</p>
            ) : (
              <p>Select a date range to filter data</p>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-10">Loading performance data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Performers */}
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="text-yellow-500" />
                Employee of the Month Candidates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Rank</th>
                      <th className="text-left p-3">Employee</th>
                      <th className="text-left p-3">Avg Rating</th>
                      <th className="text-left p-3">Ratings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffPerformance.slice(0, 5).map((staff, index) => (
                      <tr key={staff.name} className="border-b hover:bg-gray-50">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3 font-medium">{staff.name}</td>
                        <td className="p-3">{staff.averageRating}</td>
                        <td className="p-3">{staff.totalRatings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Top Areas */}
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle>Top Performing Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topAreas}>
                    <XAxis dataKey="area" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0088FE" name="Completed Tasks" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Neglected Areas */}
          <Card>
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="text-orange-500" />
                Neglected Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={neglectedAreas}>
                    <XAxis dataKey="area" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#FF8042" name="Completed Tasks" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Navigation />
    </div>
  );
};

export default Analytics;
