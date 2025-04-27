
import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
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
} from 'recharts';
import Navigation from '@/components/Navigation';

type Assignment = {
  id: string;
  area: string;
  assignee: string;
  assigneeId: string;
  status: 'needs-check' | 'in-progress' | 'done';
  assignedDate: string;
}

type StaffRating = {
  staffId: string;
  staffName: string;
  area: string;
  rating: number;
  date: string;
}

type AreaAnalytics = {
  name: string;
  completed: number;
  inProgress: number;
  needsCheck: number;
  avgRating: number;
}

type StaffAnalytics = {
  name: string;
  completed: number;
  avgRating: number;
}

// Colors for the pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Analytics = () => {
  const [areaData, setAreaData] = useState<AreaAnalytics[]>([]);
  const [staffData, setStaffData] = useState<StaffAnalytics[]>([]);
  const [statusDistribution, setStatusDistribution] = useState([
    { name: "Needs Check", value: 0 },
    { name: "In Progress", value: 0 },
    { name: "Completed", value: 0 }
  ]);
  
  useEffect(() => {
    // Load data from localStorage
    const loadData = () => {
      const assignments: Assignment[] = JSON.parse(localStorage.getItem('assignments') || '[]');
      const ratings: StaffRating[] = JSON.parse(localStorage.getItem('ratings') || '[]');
      const areas: { area: string; description: string }[] = JSON.parse(localStorage.getItem('areas') || '[]');
      const staffMembers: { id: string; name: string }[] = JSON.parse(localStorage.getItem('staffMembers') || '[]');
      
      // Process area analytics
      const areaAnalytics: AreaAnalytics[] = areas.map(area => {
        const areaAssignments = assignments.filter(a => a.area === area.area);
        const areaRatings = ratings.filter(r => r.area === area.area);
        
        const completed = areaAssignments.filter(a => a.status === 'done').length;
        const inProgress = areaAssignments.filter(a => a.status === 'in-progress').length;
        const needsCheck = areaAssignments.filter(a => a.status === 'needs-check').length;
        
        let avgRating = 0;
        if (areaRatings.length > 0) {
          avgRating = areaRatings.reduce((sum, r) => sum + r.rating, 0) / areaRatings.length;
        }
        
        return {
          name: area.area,
          completed,
          inProgress,
          needsCheck,
          avgRating
        };
      });
      
      // Process staff analytics
      const staffAnalytics: StaffAnalytics[] = staffMembers.map(staff => {
        const staffAssignments = assignments.filter(a => a.assigneeId === staff.id);
        const staffRatings = ratings.filter(r => r.staffId === staff.id);
        
        const completed = staffAssignments.filter(a => a.status === 'done').length;
        
        let avgRating = 0;
        if (staffRatings.length > 0) {
          avgRating = staffRatings.reduce((sum, r) => sum + r.rating, 0) / staffRatings.length;
        }
        
        return {
          name: staff.name,
          completed,
          avgRating
        };
      });
      
      // Status distribution
      const needsCheck = assignments.filter(a => a.status === 'needs-check').length;
      const inProgress = assignments.filter(a => a.status === 'in-progress').length;
      const completed = assignments.filter(a => a.status === 'done').length;
      
      setStatusDistribution([
        { name: "Needs Check", value: needsCheck },
        { name: "In Progress", value: inProgress },
        { name: "Completed", value: completed }
      ]);
      
      setAreaData(areaAnalytics);
      setStaffData(staffAnalytics);
    };
    
    loadData();
  }, []);

  const config = {
    blue: { color: "#0088FE" },
    green: { color: "#00C49F" },
    yellow: { color: "#FFBB28" },
    orange: { color: "#FF8042" },
    purple: { color: "#8884d8" }
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
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
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Staff Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
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
                  dataKey="avgRating" 
                  name="Average Rating" 
                  fill="#8884d8" 
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
      <Navigation />
    </div>
  );
};

export default Analytics;
