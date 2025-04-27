
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
import { Star } from 'lucide-react';
import Navigation from '@/components/Navigation';

type StaffRating = {
  staffId: string;
  staffName: string;
  area: string;
  rating: number;
  date: string;
  comment?: string;
}

const StaffRatings = () => {
  const [ratings, setRatings] = useState<StaffRating[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | 'all'>('all');
  const [staffMembers, setStaffMembers] = useState<{id: string; name: string}[]>([]);

  useEffect(() => {
    // In a real app, this would fetch data from a backend
    // For now, we'll mock some data
    const storedRatings = localStorage.getItem('ratings');
    if (storedRatings) {
      setRatings(JSON.parse(storedRatings));
    }
    
    // Get staff members from localStorage
    const storedStaff = localStorage.getItem('staffMembers');
    if (storedStaff) {
      setStaffMembers(JSON.parse(storedStaff));
    }
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

  const calculateAverageRating = (staffId: string) => {
    const staffRatings = ratings.filter(r => r.staffId === staffId);
    if (staffRatings.length === 0) return 0;
    const sum = staffRatings.reduce((acc, curr) => acc + curr.rating, 0);
    return sum / staffRatings.length;
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
                    <TableHead>Rating</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRatings.length > 0 ? (
                    filteredRatings.map((rating, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{rating.staffName}</TableCell>
                        <TableCell>{rating.area}</TableCell>
                        <TableCell>
                          <div className="flex">
                            {renderStars(rating.rating)}
                          </div>
                        </TableCell>
                        <TableCell>{rating.date}</TableCell>
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
                    <TableHead>Average Rating</TableHead>
                    <TableHead>Total Tasks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffMembers.length > 0 ? (
                    staffMembers.map((staff) => {
                      const staffRatings = ratings.filter(r => r.staffId === staff.id);
                      const avgRating = calculateAverageRating(staff.id);
                      
                      return (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium">{staff.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {renderStars(Math.round(avgRating))}
                              </div>
                              <span>({avgRating.toFixed(1)})</span>
                            </div>
                          </TableCell>
                          <TableCell>{staffRatings.length}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
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
