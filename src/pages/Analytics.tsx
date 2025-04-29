import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import Navigation from '@/components/Navigation';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { DateRangePicker } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const ASPECT_COLORS = {
  'Overall': '#FFD700',
  'Product Knowledge': '#0088FE',
  'Job Performance': '#00C49F',
  'Customer Service': '#9370DB',
  'Teamwork': '#FF8042'
};

const Analytics = () => {
  const [areaData, setAreaData] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState([
    { name: "Needs Check", value: 0 },
    { name: "In Progress", value: 0 },
    { name: "Completed", value: 0 }
  ]);
  const [aspectPerformance, setAspectPerformance] = useState<any[]>([]);
  const [areaNeglect, setAreaNeglect] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const { toast } = useToast();
  
  useEffect(() => {
    fetchData();
  }, [dateRange]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Load data from localStorage first
      const assignments: any[] = JSON.parse(localStorage.getItem('assignments') || '[]');
      const ratings: any[] = JSON.parse(localStorage.getItem('ratings') || '[]');
      const areas: any[] = JSON.parse(localStorage.getItem('areas') || '[]');
      const staffMembers: any[] = JSON.parse(localStorage.getItem('staffMembers') || '[]');
      
      // Then try to fetch from Supabase
      let supabaseAssignments: any[] = [];
      let supabaseRatings: any[] = [];
      let supabaseAreas: any[] = [];
      let supabaseStaff: any[] = [];
      
      try {
        // Fetch assignments
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('assignments')
          .select('*');
          
        if (!assignmentError && assignmentData) {
          supabaseAssignments = assignmentData;
        }
        
        // Fetch ratings
        const { data: ratingsData, error: ratingsError } = await supabase
          .from('ratings')
          .select('*');
          
        if (!ratingsError && ratingsData) {
          supabaseRatings = ratingsData.map(rating => ({
            id: rating.id,
            staffId: rating.staff_id,
            staffName: rating.staff_name,
            area: rating.area,
            date: new Date(rating.rating_date).toISOString().split('T')[0],
            comment: rating.comment,
            aspects: [
              { name: 'Overall', rating: rating.overall },
              { name: 'Product Knowledge', rating: rating.product_knowledge },
              { name: 'Job Performance', rating: rating.job_performance },
              { name: 'Customer Service', rating: rating.customer_service },
              { name: 'Teamwork', rating: rating.teamwork }
            ]
          }));
        }
        
        // Fetch areas
        const { data: areasData, error: areasError } = await supabase
          .from('areas')
          .select('*');
          
        if (!areasError && areasData) {
          supabaseAreas = areasData.map(area => ({
            area: area.name,
            description: area.description
          }));
        }
        
        // Fetch staff members
        const { data: staffData, error: staffError } = await supabase
          .from('staff_members')
          .select('*');
          
        if (!staffError && staffData) {
          supabaseStaff = staffData.map(staff => ({
            id: staff.id,
            name: staff.name
          }));
        }
      } catch (error) {
        console.error('Error fetching data from Supabase:', error);
        toast({
          title: "Connection Error",
          description: "Could not fetch data from the database. Using locally stored data.",
          variant: "destructive"
        });
      }
      
      // Merge data, preferring Supabase data when available
      const mergedAssignments = supabaseAssignments.length > 0 ? supabaseAssignments : assignments;
      const mergedRatings = supabaseRatings.length > 0 ? supabaseRatings : ratings;
      const mergedAreas = supabaseAreas.length > 0 ? supabaseAreas : areas;
      const mergedStaff = supabaseStaff.length > 0 ? supabaseStaff : staffMembers;
      
      // Filter data by date range
      const from = dateRange?.from || new Date(0);
      const to = dateRange?.to || new Date();
      
      const filteredAssignments = mergedAssignments.filter(assignment => {
        const date = new Date(assignment.assignedDate || assignment.assigned_date);
        return isWithinInterval(date, { start: from, end: to });
      });
      
      const filteredRatings = mergedRatings.filter(rating => {
        const date = new Date(rating.date);
        return isWithinInterval(date, { start: from, end: to });
      });
      
      // Process area analytics
      const areaAnalytics = mergedAreas.map(area => {
        const areaName = area.area || area.name;
        const areaAssignments = filteredAssignments.filter(
          a => (a.area === areaName) || (a.area_name === areaName)
        );
        const areaRatings = filteredRatings.filter(
          r => (r.area === areaName) || (r.area_name === areaName)
        );
        
        const completed = areaAssignments.filter(
          a => a.status === 'done' || a.status === 'completed'
        ).length;
        const inProgress = areaAssignments.filter(
          a => a.status === 'in-progress'
        ).length;
        const needsCheck = areaAssignments.filter(
          a => a.status === 'needs-check'
        ).length;
        
        // Calculate average ratings for all aspects
        const avgRatings = { overall: 0, product_knowledge: 0, job_performance: 0, customer_service: 0, teamwork: 0 };
        
        if (areaRatings.length > 0) {
          let totals = { overall: 0, product_knowledge: 0, job_performance: 0, customer_service: 0, teamwork: 0 };
          let counts = { overall: 0, product_knowledge: 0, job_performance: 0, customer_service: 0, teamwork: 0 };
          
          areaRatings.forEach(rating => {
            if (rating.aspects) {
              rating.aspects.forEach((aspect: any) => {
                if (aspect.name === 'Overall') {
                  totals.overall += aspect.rating;
                  counts.overall++;
                } else if (aspect.name === 'Product Knowledge') {
                  totals.product_knowledge += aspect.rating;
                  counts.product_knowledge++;
                } else if (aspect.name === 'Job Performance') {
                  totals.job_performance += aspect.rating;
                  counts.job_performance++;
                } else if (aspect.name === 'Customer Service') {
                  totals.customer_service += aspect.rating;
                  counts.customer_service++;
                } else if (aspect.name === 'Teamwork') {
                  totals.teamwork += aspect.rating;
                  counts.teamwork++;
                }
              });
            } else {
              // Handle Supabase rating format
              if (rating.overall) {
                totals.overall += rating.overall;
                counts.overall++;
              }
              if (rating.product_knowledge) {
                totals.product_knowledge += rating.product_knowledge;
                counts.product_knowledge++;
              }
              if (rating.job_performance) {
                totals.job_performance += rating.job_performance;
                counts.job_performance++;
              }
              if (rating.customer_service) {
                totals.customer_service += rating.customer_service;
                counts.customer_service++;
              }
              if (rating.teamwork) {
                totals.teamwork += rating.teamwork;
                counts.teamwork++;
              }
            }
          });
          
          avgRatings.overall = counts.overall ? totals.overall / counts.overall : 0;
          avgRatings.product_knowledge = counts.product_knowledge ? totals.product_knowledge / counts.product_knowledge : 0;
          avgRatings.job_performance = counts.job_performance ? totals.job_performance / counts.job_performance : 0;
          avgRatings.customer_service = counts.customer_service ? totals.customer_service / counts.customer_service : 0;
          avgRatings.teamwork = counts.teamwork ? totals.teamwork / counts.teamwork : 0;
        }
        
        const lastAssigned = areaAssignments.length > 0 
          ? new Date(Math.max(...areaAssignments.map(a => new Date(a.assignedDate || a.assigned_date).getTime())))
          : null;
        
        const daysSinceAssigned = lastAssigned 
          ? Math.floor((new Date().getTime() - lastAssigned.getTime()) / (1000 * 3600 * 24)) 
          : null;
        
        return {
          name: areaName,
          completed,
          inProgress,
          needsCheck,
          totalAssignments: areaAssignments.length,
          lastAssigned: lastAssigned ? lastAssigned.toISOString().split('T')[0] : 'Never',
          daysSinceAssigned: daysSinceAssigned !== null ? daysSinceAssigned : Infinity,
          avgOverall: avgRatings.overall,
          avgProductKnowledge: avgRatings.product_knowledge,
          avgJobPerformance: avgRatings.job_performance,
          avgCustomerService: avgRatings.customer_service,
          avgTeamwork: avgRatings.teamwork
        };
      });
      
      // Sort areas by neglect (days since last assigned)
      const neglectedAreas = [...areaAnalytics]
        .filter(area => area.daysSinceAssigned !== Infinity)
        .sort((a, b) => b.daysSinceAssigned - a.daysSinceAssigned)
        .slice(0, 5);
        
      const neverAssignedAreas = areaAnalytics
        .filter(area => area.daysSinceAssigned === Infinity)
        .map(area => ({ ...area, daysSinceAssigned: 'Never assigned' }));
        
      setAreaNeglect([...neglectedAreas, ...neverAssignedAreas]);
      
      // Process staff analytics
      const staffAnalytics = mergedStaff.map(staff => {
        const staffId = staff.id;
        const staffRatings = filteredRatings.filter(r => 
          r.staffId === staffId || r.staff_id === staffId
        );
        
        const staffAssignments = filteredAssignments.filter(a => 
          a.assigneeId === staffId || a.assignee_id === staffId
        );
        
        const completed = staffAssignments.filter(
          a => a.status === 'done' || a.status === 'completed'
        ).length;
        
        // Calculate average ratings for all aspects
        const avgRatings = { overall: 0, product_knowledge: 0, job_performance: 0, customer_service: 0, teamwork: 0 };
        
        if (staffRatings.length > 0) {
          let totals = { overall: 0, product_knowledge: 0, job_performance: 0, customer_service: 0, teamwork: 0 };
          let counts = { overall: 0, product_knowledge: 0, job_performance: 0, customer_service: 0, teamwork: 0 };
          
          staffRatings.forEach(rating => {
            if (rating.aspects) {
              rating.aspects.forEach((aspect: any) => {
                if (aspect.name === 'Overall') {
                  totals.overall += aspect.rating;
                  counts.overall++;
                } else if (aspect.name === 'Product Knowledge') {
                  totals.product_knowledge += aspect.rating;
                  counts.product_knowledge++;
                } else if (aspect.name === 'Job Performance') {
                  totals.job_performance += aspect.rating;
                  counts.job_performance++;
                } else if (aspect.name === 'Customer Service') {
                  totals.customer_service += aspect.rating;
                  counts.customer_service++;
                } else if (aspect.name === 'Teamwork') {
                  totals.teamwork += aspect.rating;
                  counts.teamwork++;
                }
              });
            } else {
              // Handle Supabase format
              if (rating.overall) {
                totals.overall += rating.overall;
                counts.overall++;
              }
              if (rating.product_knowledge) {
                totals.product_knowledge += rating.product_knowledge;
                counts.product_knowledge++;
              }
              if (rating.job_performance) {
                totals.job_performance += rating.job_performance;
                counts.job_performance++;
              }
              if (rating.customer_service) {
                totals.customer_service += rating.customer_service;
                counts.customer_service++;
              }
              if (rating.teamwork) {
                totals.teamwork += rating.teamwork;
                counts.teamwork++;
              }
            }
          });
          
          avgRatings.overall = counts.overall ? totals.overall / counts.overall : 0;
          avgRatings.product_knowledge = counts.product_knowledge ? totals.product_knowledge / counts.product_knowledge : 0;
          avgRatings.job_performance = counts.job_performance ? totals.job_performance / counts.job_performance : 0;
          avgRatings.customer_service = counts.customer_service ? totals.customer_service / counts.customer_service : 0;
          avgRatings.teamwork = counts.teamwork ? totals.teamwork / counts.teamwork : 0;
        }
        
        return {
          name: staff.name,
          completed,
          inProgress: staffAssignments.filter(a => a.status === 'in-progress').length,
          needsCheck: staffAssignments.filter(a => a.status === 'needs-check').length,
          avgOverall: avgRatings.overall,
          avgProductKnowledge: avgRatings.product_knowledge,
          avgJobPerformance: avgRatings.job_performance,
          avgCustomerService: avgRatings.customer_service,
          avgTeamwork: avgRatings.teamwork,
          totalAssignments: staffAssignments.length,
          totalRatings: staffRatings.length
        };
      });
      
      // Status distribution
      const needsCheck = filteredAssignments.filter(a => a.status === 'needs-check').length;
      const inProgress = filteredAssignments.filter(a => a.status === 'in-progress').length;
      const completed = filteredAssignments.filter(a => a.status === 'done' || a.status === 'completed').length;
      
      // Aspect performance across all staff
      const aspectData = [];
      if (mergedRatings.length > 0) {
        const aspects = [
          'Overall', 
          'Product Knowledge', 
          'Job Performance', 
          'Customer Service', 
          'Teamwork'
        ];
        
        aspectData.push(...aspects.map(aspectName => {
          let total = 0;
          let count = 0;
          
          mergedRatings.forEach(rating => {
            if (rating.aspects) {
              const aspect = rating.aspects.find((a: any) => a.name === aspectName);
              if (aspect) {
                total += aspect.rating;
                count++;
              }
            } else {
              // Handle Supabase format
              const key = aspectName.toLowerCase().replace(/\s+/g, '_');
              if (rating[key]) {
                total += rating[key];
                count++;
              }
            }
          });
          
          return {
            subject: aspectName,
            average: count > 0 ? total / count : 0,
            fullMark: 5
          };
        }));
      }
      
      // Generate timeline data by month from filtered assignments
      const timelineByMonth = new Map();
      filteredAssignments.forEach(assignment => {
        const date = new Date(assignment.assignedDate || assignment.assigned_date);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!timelineByMonth.has(monthYear)) {
          timelineByMonth.set(monthYear, {
            date: monthYear,
            completed: 0,
            inProgress: 0, 
            needsCheck: 0
          });
        }
        
        const monthData = timelineByMonth.get(monthYear);
        if (assignment.status === 'done' || assignment.status === 'completed') {
          monthData.completed++;
        } else if (assignment.status === 'in-progress') {
          monthData.inProgress++;
        } else if (assignment.status === 'needs-check') {
          monthData.needsCheck++;
        }
      });
      
      // Convert timeline map to array and sort by date
      const timelineArray = Array.from(timelineByMonth.values());
      timelineArray.sort((a, b) => a.date.localeCompare(b.date));
      
      // Update state with all our processed data
      setStatusDistribution([
        { name: "Needs Check", value: needsCheck },
        { name: "In Progress", value: inProgress },
        { name: "Completed", value: completed }
      ]);
      
      setAreaData(areaAnalytics);
      setStaffData(staffAnalytics);
      setAspectPerformance(aspectData);
      setTimelineData(timelineArray);
    } catch (error) {
      console.error('Error processing analytics data:', error);
      toast({
        title: "Error",
        description: "There was a problem generating analytics data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const config = {
    blue: { color: "#0088FE" },
    green: { color: "#00C49F" },
    yellow: { color: "#FFBB28" },
    orange: { color: "#FF8042" },
    purple: { color: "#8884d8" }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 pb-20">
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        <div className="flex justify-center items-center h-64">
          <p>Loading analytics data...</p>
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      
      <div className="mb-6">
        <DateRangePicker 
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          className="max-w-md"
        />
        {dateRange?.from && (
          <p className="text-sm text-muted-foreground mt-2">
            Showing data for: {format(dateRange.from, "MMMM d, yyyy")} 
            {dateRange.to && dateRange.to !== dateRange.from && 
              ` to ${format(dateRange.to, "MMMM d, yyyy")}`}
          </p>
        )}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ChartContainer config={config}>
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        {/* Performance Across Aspects */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Performance by Aspect</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ChartContainer config={config}>
              <RadarChart cx="50%" cy="50%" outerRadius={80} data={aspectPerformance}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 5]} />
                <Radar name="Average Rating" dataKey="average" stroke="#8884d8" 
                  fill="#8884d8" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        {/* Area Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Area Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ChartContainer config={config}>
              <BarChart
                data={areaData}
                margin={{ top: 20, right: 30, left: 20, bottom: 90 }}
              >
                <ChartTooltip content={<ChartTooltipContent />} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                />
                <YAxis />
                <Bar dataKey="completed" name="Completed" fill="#00C49F" />
                <Bar dataKey="inProgress" name="In Progress" fill="#FFBB28" />
                <Bar dataKey="needsCheck" name="Needs Check" fill="#FF8042" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        {/* Neglected Areas */}
        <Card>
          <CardHeader>
            <CardTitle>Neglected Areas</CardTitle>
            <CardDescription>Areas that haven't been assigned recently</CardDescription>
          </CardHeader>
          <CardContent className="h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead>Last Assigned</TableHead>
                  <TableHead>Days Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areaNeglect.map(area => (
                  <TableRow key={area.name}>
                    <TableCell>{area.name}</TableCell>
                    <TableCell>{area.lastAssigned}</TableCell>
                    <TableCell>
                      {typeof area.daysSinceAssigned === 'number' 
                        ? area.daysSinceAssigned 
                        : area.daysSinceAssigned}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Staff Performance */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Staff Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            <ChartContainer config={config}>
              <BarChart
                data={staffData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <ChartTooltip content={<ChartTooltipContent />} />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#00C49F" />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#8884d8" 
                  domain={[0, 5]}
                />
                <Bar 
                  yAxisId="left" 
                  dataKey="completed" 
                  name="Tasks Completed" 
                  fill="#00C49F" 
                />
                <Bar 
                  yAxisId="right" 
                  dataKey="avgOverall" 
                  name="Overall Rating" 
                  fill="#FFD700" 
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        {/* Timeline of Tasks */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Tasks Timeline</CardTitle>
            <CardDescription>Monthly activity summary</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ChartContainer config={config}>
              <LineChart
                data={timelineData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="#00C49F" name="Completed" />
                <Line type="monotone" dataKey="inProgress" stroke="#FFBB28" name="In Progress" />
                <Line type="monotone" dataKey="needsCheck" stroke="#FF8042" name="Needs Check" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        {/* Staff Performance Detail */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Staff Performance Detail</CardTitle>
          </CardHeader>
          <CardContent className="h-auto overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Product Knowledge</TableHead>
                  <TableHead>Job Performance</TableHead>
                  <TableHead>Customer Service</TableHead>
                  <TableHead>Teamwork</TableHead>
                  <TableHead>Completed Tasks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffData.map(staff => (
                  <TableRow key={staff.name}>
                    <TableCell>{staff.name}</TableCell>
                    <TableCell>{staff.avgOverall.toFixed(1)}</TableCell>
                    <TableCell>{staff.avgProductKnowledge.toFixed(1)}</TableCell>
                    <TableCell>{staff.avgJobPerformance.toFixed(1)}</TableCell>
                    <TableCell>{staff.avgCustomerService.toFixed(1)}</TableCell>
                    <TableCell>{staff.avgTeamwork.toFixed(1)}</TableCell>
                    <TableCell>{staff.completed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <Navigation />
    </div>
  );
};

export default Analytics;
