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
import { Printer } from 'lucide-react';

// Custom colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Analytics = () => {
  // Date range state for filtering
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)), // Default to last 30 days
    to: new Date()
  });

  // Fetch ratings data from Supabase
  const { data: ratings = [], isLoading: ratingsLoading, error: ratingsError, refetch: refetchRatings } = useQuery({
    queryKey: ['ratings-analytics', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ratings')
        .select('*');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch assignments data from Supabase
  const { data: assignments = [], isLoading: assignmentsLoading, error: assignmentsError, refetch: refetchAssignments } = useQuery({
    queryKey: ['assignments-analytics', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Refetch data when date range changes
  useEffect(() => {
    refetchRatings();
    refetchAssignments();
  }, [dateRange, refetchRatings, refetchAssignments]);

  useEffect(() => {
    if (ratingsError || assignmentsError) {
      toast({
        title: "Error",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive"
      });
    }
  }, [ratingsError, assignmentsError]);

  // Filter data based on date range
  const filteredRatings = ratings.filter(rating => {
    if (!dateRange?.from && !dateRange?.to) return true;
    
    const ratingDate = parseISO(rating.rating_date);
    
    if (dateRange?.from && dateRange?.to) {
      return isAfter(ratingDate, startOfDay(dateRange.from)) && 
             isBefore(ratingDate, endOfDay(dateRange.to));
    }
    
    if (dateRange?.from) {
      return isAfter(ratingDate, startOfDay(dateRange.from));
    }
    
    if (dateRange?.to) {
      return isBefore(ratingDate, endOfDay(dateRange.to));
    }
    
    return true;
  });

  const filteredAssignments = assignments.filter(assignment => {
    if (!dateRange?.from && !dateRange?.to) return true;
    
    const assignmentDate = parseISO(assignment.created_at || '');
    if (!assignmentDate) return false;
    
    if (dateRange?.from && dateRange?.to) {
      return isAfter(assignmentDate, startOfDay(dateRange.from)) && 
             isBefore(assignmentDate, endOfDay(dateRange.to));
    }
    
    if (dateRange?.from) {
      return isAfter(assignmentDate, startOfDay(dateRange.from));
    }
    
    if (dateRange?.to) {
      return isBefore(assignmentDate, endOfDay(dateRange.to));
    }
    
    return true;
  });

  // Process ratings data for charts and lists
  const staffRatingData = Object.entries(
    filteredRatings.reduce((acc: Record<string, any>, rating) => {
      if (!acc[rating.staff_name]) {
        acc[rating.staff_name] = {
          name: rating.staff_name,
          overall: 0,
          product_knowledge: 0,
          customer_service: 0,
          job_performance: 0,
          teamwork: 0,
          count: 0
        };
      }
      
      acc[rating.staff_name].overall += rating.overall;
      acc[rating.staff_name].product_knowledge += rating.product_knowledge;
      acc[rating.staff_name].customer_service += rating.customer_service;
      acc[rating.staff_name].job_performance += rating.job_performance;
      acc[rating.staff_name].teamwork += rating.teamwork;
      acc[rating.staff_name].count += 1;
      
      return acc;
    }, {})
  ).map(([_, data]) => {
    const count = data.count;
    return {
      name: data.name,
      overall: +(data.overall / count).toFixed(1),
      product_knowledge: +(data.product_knowledge / count).toFixed(1),
      customer_service: +(data.customer_service / count).toFixed(1),
      job_performance: +(data.job_performance / count).toFixed(1),
      teamwork: +(data.teamwork / count).toFixed(1),
      totalRatings: count
    };
  })
  .sort((a, b) => b.overall - a.overall); // Sort from best to worst

  // Area completion data - shows areas with completed assignments
  const completedAreaData = Object.entries(
    filteredAssignments
      .filter(assignment => assignment.status === 'completed')
      .reduce((acc: Record<string, number>, assignment) => {
        const area = assignment.area;
        acc[area] = (acc[area] || 0) + 1;
        return acc;
      }, {})
  ).map(([area, count]) => ({
    name: area,
    completed: count
  }))
  .sort((a, b) => b.completed - a.completed); // Sort by most completed

  // Task status data
  const statusCounts = filteredAssignments.reduce((acc: Record<string, number>, assignment) => {
    const status = assignment.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const taskStatusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace('-', ' '),
    value: count
  }));

  // Staff workload data
  const staffWorkloadData = Object.entries(
    filteredAssignments.reduce((acc: Record<string, number>, assignment) => {
      acc[assignment.assignee_name] = (acc[assignment.assignee_name] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({
    name,
    tasks: count
  }));

  const isLoading = ratingsLoading || assignmentsLoading;

  // Print functionality
  const handlePrint = () => {
    const printContent = document.getElementById('printable-content');
    const printWindow = window.open('', '_blank');
    
    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Staff Performance Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
              .date-range { font-style: italic; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Staff Performance Report</h1>
              <div class="date-range">
                ${dateRange?.from && dateRange?.to ? 
                  `Report period: ${format(dateRange.from, 'PP')} to ${format(dateRange.to, 'PP')}` : 
                  'All time data'}
              </div>
            </div>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 200);
    }
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Report
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
        <div className="text-center py-10">Loading analytics data...</div>
      ) : (
        <>
          {/* Printable content */}
          <div id="printable-content" className="printable-content">
            {/* Staff Performance List */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Staff Performance Ranking (Best to Worst)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Rank</th>
                        <th className="text-left p-3">Staff Member</th>
                        <th className="text-left p-3">Overall Rating</th>
                        <th className="text-left p-3">Product Knowledge</th>
                        <th className="text-left p-3">Customer Service</th>
                        <th className="text-left p-3">Job Performance</th>
                        <th className="text-left p-3">Teamwork</th>
                        <th className="text-left p-3">Total Ratings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffRatingData.map((staff, index) => (
                        <tr key={staff.name} className="border-b hover:bg-gray-50">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3 font-medium">{staff.name}</td>
                          <td className="p-3">{staff.overall}</td>
                          <td className="p-3">{staff.product_knowledge}</td>
                          <td className="p-3">{staff.customer_service}</td>
                          <td className="p-3">{staff.job_performance}</td>
                          <td className="p-3">{staff.teamwork}</td>
                          <td className="p-3">{staff.totalRatings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Charts (hidden when printing) */}
            <div className="no-print">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Staff Performance Ratings (Best to Worst)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={staffRatingData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 40 }}
                        >
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                          <YAxis domain={[0, 5]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="overall" name="Overall" fill="#0088FE" />
                          <Bar dataKey="product_knowledge" name="Product Knowledge" fill="#00C49F" />
                          <Bar dataKey="customer_service" name="Customer Service" fill="#FFBB28" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Completed Tasks by Area</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={completedAreaData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 40 }}
                        >
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="completed" name="Completed Tasks" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Task Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full flex justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={taskStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {taskStatusData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Staff Workload</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={staffWorkloadData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 40 }}
                        >
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="tasks" name="Assigned Tasks" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </>
      )}

      <Navigation />
    </div>
  );
};

export default Analytics;
