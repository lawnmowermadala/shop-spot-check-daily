import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { BarChart, XAxis, YAxis, Bar, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, Trophy, AlertTriangle, Lightbulb, Filter, User, Star, Award, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface Rating {
  id: number;
  staff_id: string;
  staff_name: string;
  overall: number;
  product_knowledge: number;
  customer_service: number;
  job_performance: number;
  teamwork: number;
  comment?: string;
  rating_date: string;
  created_at: string;
}

interface Assignment {
  id: string;
  area: string;
  assignee_id: number;
  assignee_name: string;
  status: string;
  instructions?: string;
  photo_url?: string | null;
  created_at?: string | null;
}

interface StaffMember {
  id: number;
  name: string;
}

interface StaffPerformance {
  name: string;
  averageRating: number;
  totalRatings: number;
  selfInitiativeCount: number;
  area?: string;
}

interface AreaCompletionData {
  area: string;
  count: number;
}

const Analytics = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingMode, setRatingMode] = useState(false);
  const [staffToRate, setStaffToRate] = useState<StaffMember | null>(null);

  // Rating form state
  const [ratingForm, setRatingForm] = useState({
    product_knowledge: 5,
    customer_service: 5,
    job_performance: 5,
    teamwork: 5,
    comment: ''
  });

  // Fetch ratings data
  const { data: ratings = [], isLoading: ratingsLoading, error: ratingsError, refetch: refetchRatings } = useQuery({
    queryKey: ['ratings-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ratings').select('*');
      if (error) throw error;
      return data as Rating[] || [];
    }
  });

  // Fetch assignments data
  const { data: assignments = [], isLoading: assignmentsLoading, error: assignmentsError, refetch: refetchAssignments } = useQuery({
    queryKey: ['assignments-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('assignments').select('*');
      if (error) throw error;
      return data as Assignment[] || [];
    }
  });

  // Fetch staff members
  const { data: staffMembers = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as StaffMember[];
    }
  });

  // Mutation for adding a new rating
  const addRating = useMutation({
    mutationFn: async () => {
      if (!staffToRate) throw new Error('No staff member selected');
      
      const overall = (
        ratingForm.product_knowledge + 
        ratingForm.customer_service + 
        ratingForm.job_performance + 
        ratingForm.teamwork
      ) / 4;

      const { error } = await supabase
        .from('ratings')
        .insert({
          staff_id: staffToRate.id.toString(),
          staff_name: staffToRate.name,
          overall,
          product_knowledge: ratingForm.product_knowledge,
          customer_service: ratingForm.customer_service,
          job_performance: ratingForm.job_performance,
          teamwork: ratingForm.teamwork,
          comment: ratingForm.comment,
          rating_date: new Date().toISOString()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Rating submitted successfully!",
        variant: "default"
      });
      refetchRatings();
      resetRatingForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation for awarding self initiative
  const awardSelfInitiative = useMutation({
    mutationFn: async (staffName: string) => {
      const { error } = await supabase
        .from('assignments')
        .insert({
          assignee_name: staffName,
          area: 'Special Recognition',
          status: 'completed',
          instructions: `[SELF INITIATIVE MERIT AWARD] ${staffName} demonstrated exceptional initiative on ${format(new Date(), 'PP')}`,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Award Granted",
        description: "Self-initiative award has been recorded!",
        variant: "default"
      });
      refetchAssignments();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetRatingForm = () => {
    setRatingForm({
      product_knowledge: 5,
      customer_service: 5,
      job_performance: 5,
      teamwork: 5,
      comment: ''
    });
    setStaffToRate(null);
    setRatingMode(false);
  };

  const handleRateStaff = (staff: StaffMember) => {
    setStaffToRate(staff);
    setRatingMode(true);
  };

  const handleAwardInitiative = (staffName: string) => {
    if (confirm(`Grant ${staffName} a Self-Initiative Award?`)) {
      awardSelfInitiative.mutate(staffName);
    }
  };

  useEffect(() => {
    if (ratingsError || assignmentsError) {
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    }
  }, [ratingsError, assignmentsError]);

  // Filter data by date range and selections
  const filterData = <T extends { [key: string]: any }>(items: T[], dateField: string): T[] => {
    let filtered = [...items];
    
    // Filter by date range
    if (dateRange?.from || dateRange?.to) {
      filtered = filtered.filter(item => {
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
    }

    // Filter by selected staff
    if (selectedStaff !== 'all') {
      filtered = filtered.filter(item => 
        item.staff_name === selectedStaff || item.assignee_name === selectedStaff
      );
    }

    // Filter by selected area
    if (selectedArea !== 'all') {
      filtered = filtered.filter(item => item.area === selectedArea);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.staff_name?.toLowerCase().includes(term) || 
        item.assignee_name?.toLowerCase().includes(term) ||
        item.area?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const filteredRatings = filterData(ratings, 'rating_date');
  const filteredAssignments = filterData(assignments, 'created_at');

  // Get unique areas from assignments
  const uniqueAreas = [...new Set(assignments.map(a => a.area))].sort();

  // Count self-initiative awards by staff member
  const selfInitiativeCounts = filteredAssignments.reduce((acc: Record<string, number>, assignment) => {
    if (assignment.instructions && assignment.instructions.includes('[SELF INITIATIVE MERIT AWARD]')) {
      acc[assignment.assignee_name] = (acc[assignment.assignee_name] || 0) + 1;
    }
    return acc;
  }, {});

  // Process staff ratings (sorted best to worst) and include self-initiative counts
  const staffPerformance: StaffPerformance[] = Object.entries(
    filteredRatings.reduce((acc: Record<string, { name: string; overall: number; count: number }>, rating) => {
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
  ).map(([_, data]) => {
    // Find the most common area for this staff member
    const staffAssignments = filteredAssignments.filter(a => a.assignee_name === data.name);
    const areaCounts = staffAssignments.reduce((acc: Record<string, number>, assignment) => {
      acc[assignment.area] = (acc[assignment.area] || 0) + 1;
      return acc;
    }, {});
    const mostCommonArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      name: data.name,
      averageRating: Number((data.overall / data.count).toFixed(1)),
      totalRatings: data.count,
      selfInitiativeCount: selfInitiativeCounts[data.name] || 0,
      area: mostCommonArea
    };
  })
  .sort((a, b) => {
    // Sort by self-initiative count first, then by average rating
    if (a.selfInitiativeCount !== b.selfInitiativeCount) {
      return b.selfInitiativeCount - a.selfInitiativeCount;
    }
    return b.averageRating - a.averageRating;
  });

  // Process area completion data
  const areaCompletion: AreaCompletionData[] = Object.entries(
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

  const isLoading = ratingsLoading || assignmentsLoading || staffLoading;

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
              .self-initiative { background-color: #fef3c7; }
              .filter-info { background-color: #f5f5f5; padding: 10px; margin-bottom: 15px; border-radius: 4px; }
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

            <div class="filter-info">
              <strong>Filters Applied:</strong><br>
              ${selectedStaff !== 'all' ? `Staff: ${selectedStaff}<br>` : ''}
              ${selectedArea !== 'all' ? `Area: ${selectedArea}<br>` : ''}
              ${searchTerm ? `Search Term: ${searchTerm}<br>` : ''}
            </div>

            <h2>Employee Performance</h2>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Employee</th>
                  <th>Average Rating</th>
                  <th>Total Ratings</th>
                  <th>Self Initiative Awards</th>
                  <th>Primary Area</th>
                </tr>
              </thead>
              <tbody>
                ${staffPerformance.map((staff, index) => `
                  <tr class="${index === 0 ? 'top-performer' : ''} ${staff.selfInitiativeCount > 0 ? 'self-initiative' : ''}">
                    <td>${index + 1}</td>
                    <td>${staff.name}</td>
                    <td>${staff.averageRating}</td>
                    <td>${staff.totalRatings}</td>
                    <td>${staff.selfInitiativeCount}</td>
                    <td>${staff.area || 'N/A'}</td>
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
        <div className="flex gap-2">
          <Button 
            variant={ratingMode ? "secondary" : "outline"} 
            onClick={() => setRatingMode(!ratingMode)}
            className="gap-2"
          >
            <Star className="h-4 w-4" />
            {ratingMode ? 'Cancel Rating' : 'Rate Staff'}
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {ratingMode ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Rate Staff Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Select Staff Member *</label>
                  <Select 
                    value={staffToRate?.id.toString() || ''} 
                    onValueChange={(value) => {
                      const selected = staffMembers.find(s => s.id.toString() === value);
                      if (selected) setStaffToRate(selected);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member to rate">
                        {staffToRate?.name || 'Select staff member'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {staffMembers.map(staff => (
                        <SelectItem key={staff.id} value={staff.id.toString()}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {staffToRate && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Product Knowledge: {ratingForm.product_knowledge}/10
                      </label>
                      <Slider
                        value={[ratingForm.product_knowledge]}
                        onValueChange={(value) => setRatingForm({...ratingForm, product_knowledge: value[0]})}
                        min={1}
                        max={10}
                        step={1}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Customer Service: {ratingForm.customer_service}/10
                      </label>
                      <Slider
                        value={[ratingForm.customer_service]}
                        onValueChange={(value) => setRatingForm({...ratingForm, customer_service: value[0]})}
                        min={1}
                        max={10}
                        step={1}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Job Performance: {ratingForm.job_performance}/10
                      </label>
                      <Slider
                        value={[ratingForm.job_performance]}
                        onValueChange={(value) => setRatingForm({...ratingForm, job_performance: value[0]})}
                        min={1}
                        max={10}
                        step={1}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Teamwork: {ratingForm.teamwork}/10
                      </label>
                      <Slider
                        value={[ratingForm.teamwork]}
                        onValueChange={(value) => setRatingForm({...ratingForm, teamwork: value[0]})}
                        min={1}
                        max={10}
                        step={1}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Comments (Optional)</label>
                  <Textarea
                    value={ratingForm.comment}
                    onChange={(e) => setRatingForm({...ratingForm, comment: e.target.value})}
                    placeholder="Add any comments about this staff member's performance..."
                    rows={8}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetRatingForm}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => addRating.mutate()}
                    disabled={!staffToRate || addRating.isPending}
                  >
                    {addRating.isPending ? "Submitting..." : "Submit Rating"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date Range</label>
                <DateRangePicker 
                  dateRange={dateRange} 
                  onDateRangeChange={setDateRange} 
                  className="w-full" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Staff Member</label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member">
                      {selectedStaff === 'all' ? 'All Staff' : selectedStaff}
                      </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staffMembers.map(staff => (
                      <SelectItem key={staff.id} value={staff.name}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Area</label>
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select area">
                      {selectedArea === 'all' ? 'All Areas' : selectedArea}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {uniqueAreas.map(area => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search staff or areas..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
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
                    Employee Performance
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
                          <th className="text-left p-3 flex items-center gap-1">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            Self Initiative
                          </th>
                          <th className="text-left p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffPerformance.length > 0 ? (
                          staffPerformance.map((staff, index) => (
                            <tr key={staff.name} className="border-b hover:bg-gray-50">
                              <td className="p-3">{index + 1}</td>
                              <td className="p-3 font-medium">
                                {staff.name}
                                {staff.selfInitiativeCount > 0 && (
                                  <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                                    Initiative Star
                                  </span>
                                )}
                              </td>
                              <td className="p-3">{staff.averageRating}</td>
                              <td className="p-3">{staff.totalRatings}</td>
                              <td className="p-3">
                                <span className={`font-semibold ${staff.selfInitiativeCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                  {staff.selfInitiativeCount}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRateStaff(staffMembers.find(s => s.name === staff.name)!)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Star className="h-4 w-4 text-blue-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAwardInitiative(staff.name)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Award className="h-4 w-4 text-amber-500" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="text-center py-4 text-gray-500">
                              No staff performance data found with current filters
                            </td>
                          </tr>
                        )}
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
                  {topAreas.length > 0 ? (
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
                  ) : (
                    <div className="text-center py-10 text-gray-500">
                      No area performance data found with current filters
                    </div>
                  )}
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
                  {neglectedAreas.length > 0 ? (
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
                  ) : (
                    <div className="text-center py-10 text-gray-500">
                      No neglected areas found with current filters
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Self Initiative Summary */}
              <Card>
                <CardHeader className="bg-amber-50">
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="text-amber-500" />
                    Self Initiative Awards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(selfInitiativeCounts).length > 0 ? (
                      Object.entries(selfInitiativeCounts)
                        .sort(([,a], [,b]) => b - a)
                        .map(([staffName, count]) => (
                          <div key={staffName} className="flex justify-between items-center p-2 bg-amber-100 rounded">
                            <span className="font-medium">{staffName}</span>
                            <div className="flex gap-2">
                              <span className="bg-amber-200 text-amber-800 px-2 py-1 rounded text-sm font-semibold">
                                {count} award{count !== 1 ? 's' : ''}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAwardInitiative(staffName)}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-4 w-4 text-amber-600" />
                              </Button>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        No self-initiative awards recorded with current filters
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      <Navigation />
    </div>
  );
};

export default Analytics;
