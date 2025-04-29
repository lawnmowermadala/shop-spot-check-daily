
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
  CardTitle 
} from "@/components/ui/card";
import { Star, Award, ThumbsUp, CustomerService, Users } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

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

const StaffRatings = () => {
  const [ratings, setRatings] = useState<StaffRating[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | 'all'>('all');
  const [staffMembers, setStaffMembers] = useState<{id: string; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
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
  
  const filteredRatings = selectedStaff === 'all' 
    ? ratings 
    : ratings.filter(rating => rating.staffId === selectedStaff);

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
      />
    ));
  };

  const calculateAverageRating = (staffId: string, aspectName?: string) => {
    const staffRatings = ratings.filter(r => r.staffId === staffId);
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
        return <CustomerService className="h-4 w-4 text-purple-500" />;
      case 'Teamwork':
        return <Users className="h-4 w-4 text-orange-500" />;
      default:
        return <Star className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Staff Ratings</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Staff Performance Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
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
                        No ratings found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Staff Summary</CardTitle>
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
                    <TableHead>Total Tasks</TableHead>
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
                      const staffRatings = ratings.filter(r => r.staffId === staff.id);
                      
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
