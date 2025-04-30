
import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Star } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Rating {
  id: string;
  staff_name: string;
  staff_id: string;
  area: string;
  overall: number;
  product_knowledge: number;
  customer_service: number;
  job_performance: number;
  teamwork: number;
  comment?: string;
  rating_date: string;
}

const StaffRatings = () => {
  const navigate = useNavigate();
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  
  // Fetch ratings from Supabase
  const { data: ratings = [], isLoading, error } = useQuery({
    queryKey: ['ratings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .order('rating_date', { ascending: false });
      
      if (error) throw error;
      return data as Rating[];
    }
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load ratings. Please try again.",
        variant: "destructive"
      });
    }
  }, [error]);

  // Get unique staff members from ratings
  const staffMembers = Array.from(
    new Set(ratings.map(rating => rating.staff_name))
  );
  
  const filteredRatings = selectedStaff === 'all'
    ? ratings
    : ratings.filter(rating => rating.staff_name === selectedStaff);

  // Render star rating
  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Staff Ratings</h1>
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <label htmlFor="staff-filter" className="font-medium">Filter by Staff:</label>
          <select
            id="staff-filter"
            className="border rounded p-1"
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
          >
            <option value="all">All Staff</option>
            {staffMembers.map(staff => (
              <option key={staff} value={staff}>{staff}</option>
            ))}
          </select>
        </div>
        
        <Button onClick={() => navigate('/rate-staff')}>
          Rate Staff Member
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Performance Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6">Loading ratings...</div>
          ) : filteredRatings.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Overall Rating</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRatings.map((rating) => (
                    <TableRow key={rating.id}>
                      <TableCell className="font-medium">{rating.staff_name}</TableCell>
                      <TableCell>{rating.area}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {renderStars(rating.overall)}
                          <span className="ml-2">{rating.overall}/5</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(rating.rating_date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No ratings found
            </div>
          )}
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default StaffRatings;
