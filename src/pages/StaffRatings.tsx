
import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Star, Award, ThumbsUp, HeadphonesIcon, Users, Trophy, Medal } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { DateRangePicker } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type RatingAspect = {
  name: string;
  rating: number;
};

type StaffRating = {
  id: string;
  staffId: string;
  staffName: string;
  area: string;
  date: string;
  comment?: string;
  aspects: RatingAspect[];
};

type TopPerformer = {
  staffId: string;
  staffName: string;
  count: number;
  average: number;
  aspects: {
    [key: string]: number;
  };
};

const StaffRatings = () => {
  const [ratings, setRatings] = useState<StaffRating[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | 'all'>('all');
  const [staffMembers, setStaffMembers] = useState<{id: string; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const { toast } = useToast();

  const fetchRatings = async () => {
    try {
      setLoading(true);
      
      // First, check if we have ratings in localStorage
      const storedRatings = localStorage.getItem('ratings');
      if (storedRatings) {
        setRatings(JSON.parse(storedRatings));
      }
      
      // Then fetch from Supabase
      const { data, error } = await supabase
        .from('ratings')
        .select('*');
        
      if (error) {
        console.error('Error fetching ratings from Supabase:', error);
        toast({
          title: "Connection Error",
          description: "Could not fetch ratings from the database. Showing locally stored data.",
          variant: "destructive"
        });
      } else if (data) {
        // Transform the Supabase data format to match our app's format
        const transformedRatings = data.map(rating => ({
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
        
        setRatings(transformedRatings);
        // Update localStorage
        localStorage.setItem('ratings', JSON.stringify(transformedRatings));
      }
      
      // Fetch staff members
      const storedStaff = localStorage.getItem('staffMembers');
      if (storedStaff) {
        setStaffMembers(JSON.parse(storedStaff));
      }
      
      const { data: staffData, error: staffError } = await supabase
        .from('staff_members')
        .select('*');
        
      if (staffError) {
        console.error('Error fetching staff from Supabase:', staffError);
      } else if (staffData) {
        const transformedStaff = staffData.map(staff => ({
          id: staff.id,
          name: staff.name
        }));
        
        setStaffMembers(transformedStaff);
        localStorage.setItem('staffMembers', JSON.stringify(transformedStaff));
      }
    } catch (error) {
      console.error('Error in fetchRatings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);
  
  useEffect(() => {
    calculateTopPerformers();
  }, [ratings, dateRange]);
  
  const calculateTopPerformers = () => {
    if (!dateRange?.from || !ratings.length) return;
    
    const to = dateRange.to || dateRange.from;
    
    // Filter ratings by date range
    const filteredRatings = ratings.filter(rating => {
      const ratingDate = new Date(rating.date);
      return isWithinInterval(ratingDate, { 
        start: dateRange.from as Date, 
        end: to 
      });
    });
    
    // Group by staff
    const staffPerformance = new Map<string, TopPerformer>();
    
    filteredRatings.forEach(rating => {
      if (!staffPerformance.has(rating.staffId)) {
        staffPerformance.set(rating.staffId, {
          staffId: rating.staffId,
          staffName: rating.staffName,
          count: 0,
          average: 0,
          aspects: {
            'Overall': 0,
            'Product Knowledge': 0,
            'Job Performance': 0,
            'Customer Service': 0,
            'Teamwork': 0
          }
        });
      }
      
      const staff = staffPerformance.get(rating.staffId)!;
      staff.count += 1;
      
      // Sum up all aspect ratings
      rating.aspects.forEach(aspect => {
        if (!staff.aspects[aspect.name]) {
          staff.aspects[aspect.name] = 0;
        }
        staff.aspects[aspect.name] += aspect.rating;
      });
    });
    
    // Calculate averages and sort
    const performers = Array.from(staffPerformance.values())
      .map(staff => {
        // Calculate average for each aspect
        Object.keys(staff.aspects).forEach(aspect => {
          staff.aspects[aspect] = staff.aspects[aspect] / staff.count;
        });
        
        // Calculate overall average across all aspects
        const sum = Object.values(staff.aspects).reduce((a, b) => a + b, 0);
        staff.average = sum / Object.keys(staff.aspects).length;
        
        return staff;
      })
      .sort((a, b) => {
        // Sort by count first, then by average
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return b.average - a.average;
      });
    
    setTopPerformers(performers);
  };

  const filteredRatingsByDate = (ratings: StaffRating[]) => {
    if (!dateRange?.from) return ratings;
    
    const to = dateRange.to || dateRange.from;
    
    return ratings.filter(rating => {
      const ratingDate = new Date(rating.date);
      return isWithinInterval(ratingDate, { 
        start: dateRange.from as Date, 
        end: to 
      });
    });
  };
  
  const filteredRatings = filteredRatingsByDate(
    selectedStaff === 'all' 
      ? ratings 
      : ratings.filter(rating => rating.staffId === selectedStaff)
  );

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
      />
    ));
  };

  const calculateAverageRating = (staffId: string, aspectName?: string) => {
    const staffRatings = filteredRatingsByDate(ratings.filter(r => r.staffId === staffId));
    if (staffRatings.length === 0) return 0;
    
    if (aspectName) {
      let sum = 0;
      let count = 0;
      
      staffRatings.forEach(rating => {
        const aspect = rating.aspects.find(a => a.name === aspectName);
        if (aspect) {
          sum += aspect.rating;
          count++;
        }
      });
      
      return count > 0 ? sum / count : 0;
    } else {
      // Overall average across all aspects
      let sum = 0;
      let count = 0;
      
      staffRatings.forEach(rating => {
        rating.aspects.forEach(aspect => {
          sum += aspect.rating;
          count++;
        });
      });
      
      return count > 0 ? sum / count : 0;
    }
  };

  const getAspectIcon = (aspectName: string) => {
    switch (aspectName) {
      case 'Overall':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'Product Knowledge':
        return <Award className="h-4 w-4 text-blue-500" />;
      case 'Job Performance':
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'Customer Service':
        return <HeadphonesIcon className="h-4 w-4 text-purple-500" />;
      case 'Teamwork':
        return <Users className="h-4 w-4 text-orange-500" />;
      default:
        return <Star className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Staff Ratings</h1>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/2">
          <DateRangePicker 
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>
        <div className="w-full md:w-1/2">
          <select 
            className="w-full p-2 border rounded-md"
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
          >
            <option value="all">All Staff Members</option>
            {staffMembers.map(staff => (
              <option key={staff.id} value={staff.id}>{staff.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="grid gap-6">
        {/* Top Performers Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Performers
            </CardTitle>
            <CardDescription>
              {dateRange?.from && (
                <>
                  For period: {format(dateRange.from, "MMMM d, yyyy")} 
                  {dateRange.to && dateRange.to !== dateRange.from && 
                    ` - ${format(dateRange.to, "MMMM d, yyyy")}`}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Ratings Count</TableHead>
                    <TableHead>Overall Avg</TableHead>
                    <TableHead>Highest Aspect</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        Loading top performers...
                      </TableCell>
                    </TableRow>
                  ) : topPerformers.length > 0 ? (
                    topPerformers.slice(0, 3).map((performer, index) => {
                      // Find highest rated aspect
                      const aspects = Object.entries(performer.aspects);
                      const highestAspect = aspects.reduce((highest, current) => 
                        current[1] > highest[1] ? current : highest, 
                        aspects[0]
                      );
                      
                      return (
                        <TableRow key={performer.staffId}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {index === 0 ? (
                                <Trophy className="h-5 w-5 text-yellow-500" />
                              ) : index === 1 ? (
                                <Medal className="h-5 w-5 text-gray-400" />
                              ) : index === 2 ? (
                                <Medal className="h-5 w-5 text-amber-600" />
                              ) : (
                                <span>{index + 1}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{performer.staffName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{performer.count}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <div className="flex">
                                {renderStars(Math.round(performer.average))}
                              </div>
                              <span className="text-xs font-medium ml-1">
                                ({performer.average.toFixed(1)})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getAspectIcon(highestAspect[0])}
                              <span className="text-sm">{highestAspect[0]}: </span>
                              <div className="flex">
                                {renderStars(Math.round(highestAspect[1]))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No ratings found for the selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* Ratings List Card */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Performance Ratings</CardTitle>
            <CardDescription>
              {filteredRatings.length} ratings found
              {dateRange?.from && (
                <> for period {format(dateRange.from, "MMM d, yyyy")} 
                  {dateRange.to && dateRange.to !== dateRange.from && 
                    ` - ${format(dateRange.to, "MMM d, yyyy")}`}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Ratings</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        Loading ratings...
                      </TableCell>
                    </TableRow>
                  ) : filteredRatings.length > 0 ? (
                    filteredRatings.map((rating) => (
                      <TableRow key={rating.id}>
                        <TableCell className="font-medium">{rating.staffName}</TableCell>
                        <TableCell>{rating.area}</TableCell>
                        <TableCell>{rating.date}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {rating.aspects.map((aspect) => (
                              <div key={aspect.name} className="flex items-center gap-2">
                                {getAspectIcon(aspect.name)}
                                <span className="text-xs font-medium">{aspect.name}:</span>
                                <div className="flex">
                                  {renderStars(aspect.rating)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{rating.comment || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No ratings found for the selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* Staff Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Summary</CardTitle>
            <CardDescription>
              Performance metrics for the selected date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Product Knowledge</TableHead>
                    <TableHead>Job Performance</TableHead>
                    <TableHead>Customer Service</TableHead>
                    <TableHead>Teamwork</TableHead>
                    <TableHead>Total Ratings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6">
                        Loading data...
                      </TableCell>
                    </TableRow>
                  ) : staffMembers.length > 0 ? (
                    staffMembers.map((staff) => {
                      const staffRatings = filteredRatingsByDate(
                        ratings.filter(r => r.staffId === staff.id)
                      );
                      
                      return (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium">{staff.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {renderStars(Math.round(calculateAverageRating(staff.id, "Overall")))}
                              </div>
                              <span className="text-xs">
                                ({calculateAverageRating(staff.id, "Overall").toFixed(1)})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex">
                              {renderStars(Math.round(calculateAverageRating(staff.id, "Product Knowledge")))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex">
                              {renderStars(Math.round(calculateAverageRating(staff.id, "Job Performance")))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex">
                              {renderStars(Math.round(calculateAverageRating(staff.id, "Customer Service")))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex">
                              {renderStars(Math.round(calculateAverageRating(staff.id, "Teamwork")))}
                            </div>
                          </TableCell>
                          <TableCell>{staffRatings.length}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        No staff members found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Navigation />
    </div>
  );
};

export default StaffRatings;
