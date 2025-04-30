
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { BarChart, XAxis, YAxis, Bar, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

// Custom colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Analytics = () => {
  // Fetch ratings data from Supabase
  const { data: ratings = [], isLoading: ratingsLoading, error: ratingsError } = useQuery({
    queryKey: ['ratings-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ratings')
        .select('*');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch assignments data from Supabase
  const { data: assignments = [], isLoading: assignmentsLoading, error: assignmentsError } = useQuery({
    queryKey: ['assignments-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*');
      
      if (error) throw error;
      return data || [];
    }
  });

  useEffect(() => {
    if (ratingsError || assignmentsError) {
      toast({
        title: "Error",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive"
      });
    }
  }, [ratingsError, assignmentsError]);

  // Process ratings data for charts
  const staffRatingData = Object.entries(
    ratings.reduce((acc: Record<string, any>, rating) => {
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
      teamwork: +(data.teamwork / count).toFixed(1)
    };
  });

  // Task status data
  const statusCounts = assignments.reduce((acc: Record<string, number>, assignment) => {
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
    assignments.reduce((acc: Record<string, number>, assignment) => {
      acc[assignment.assignee_name] = (acc[assignment.assignee_name] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({
    name,
    tasks: count
  }));

  // Find top performers
  const topPerformers = [...staffRatingData]
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 5);

  const isLoading = ratingsLoading || assignmentsLoading;

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>

      {isLoading ? (
        <div className="text-center py-10">Loading analytics data...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Staff Performance Ratings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <BarChart
                    width={500}
                    height={300}
                    data={topPerformers}
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full flex justify-center">
                  <PieChart width={400} height={300}>
                    <Pie
                      data={taskStatusData}
                      cx={200}
                      cy={150}
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Staff Workload</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <BarChart
                    width={500}
                    height={300}
                    data={staffWorkloadData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 40 }}
                  >
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tasks" name="Assigned Tasks" fill="#8884d8" />
                  </BarChart>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Navigation />
    </div>
  );
};

export default Analytics;
