
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Award, ThumbsUp, HeadphonesIcon, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabaseClient';
import Navigation from '@/components/Navigation';

// Define the rating form schema
const ratingSchema = z.object({
  staffId: z.string().uuid({ message: "Please select a staff member" }),
  area: z.string().min(1, { message: "Please enter an area" }),
  overall: z.number().min(1).max(5),
  productKnowledge: z.number().min(1).max(5),
  jobPerformance: z.number().min(1).max(5),
  customerService: z.number().min(1).max(5),
  teamwork: z.number().min(1).max(5),
  comment: z.string().optional(),
});

type RatingFormValues = z.infer<typeof ratingSchema>;

type StaffMember = {
  id: string;
  name: string;
  position?: string;
  department?: string;
};

const RateStaff = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Initialize form
  const form = useForm<RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      staffId: '',
      area: '',
      overall: 0,
      productKnowledge: 0,
      jobPerformance: 0,
      customerService: 0,
      teamwork: 0,
      comment: '',
    },
  });

  // Fetch staff members from Supabase
  useEffect(() => {
    const fetchStaffMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('staff_members')
          .select('*');
          
        if (error) {
          console.error('Error fetching staff:', error);
          toast({
            title: "Error",
            description: "Could not fetch staff members. Please try again.",
            variant: "destructive"
          });
        } else if (data) {
          setStaffMembers(data);
        }
      } catch (error) {
        console.error('Error in fetchStaffMembers:', error);
      }
    };
    
    fetchStaffMembers();
  }, [toast]);

  // Function to render star rating input
  const RatingInput = ({ 
    label, 
    icon, 
    name 
  }: { 
    label: string; 
    icon: JSX.Element; 
    name: "overall" | "productKnowledge" | "jobPerformance" | "customerService" | "teamwork"; 
  }) => {
    const value = form.watch(name);
    
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className="space-y-2">
            <div className="flex justify-between items-center">
              <FormLabel className="flex items-center gap-2">
                {icon}
                {label}
              </FormLabel>
              <span className="text-sm text-gray-500">
                {value > 0 ? `${value}/5` : "Not rated"}
              </span>
            </div>
            <FormControl>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    type="button"
                    variant="ghost"
                    className="p-1 h-8"
                    onClick={() => field.onChange(rating)}
                  >
                    <Star 
                      className={`h-5 w-5 ${
                        field.value >= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`} 
                    />
                  </Button>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  // Submit handler
  const onSubmit = async (data: RatingFormValues) => {
    setIsLoading(true);
    
    try {
      // Find the selected staff member name
      const selectedStaff = staffMembers.find(staff => staff.id === data.staffId);
      
      if (!selectedStaff) {
        toast({
          title: "Error",
          description: "Selected staff member not found.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Insert rating into Supabase
      const { error } = await supabase.from('ratings').insert({
        staff_id: data.staffId,
        staff_name: selectedStaff.name,
        overall: data.overall,
        product_knowledge: data.productKnowledge,
        job_performance: data.jobPerformance,
        customer_service: data.customerService,
        teamwork: data.teamwork,
        area: data.area,
        comment: data.comment || null
      });

      if (error) {
        console.error('Error submitting rating:', error);
        toast({
          title: "Error",
          description: "Failed to submit rating. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Rating submitted successfully!",
        });
        // Redirect to ratings page
        navigate('/ratings');
      }
    } catch (error) {
      console.error('Error in onSubmit:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Rate Staff Performance</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Staff Performance Evaluation</CardTitle>
          <CardDescription>
            Rate a staff member's performance in different areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Staff Member Selection */}
              <FormField
                control={form.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.name} {staff.position && `- ${staff.position}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Area Input */}
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area/Department</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an area" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Front End">Front End</SelectItem>
                          <SelectItem value="Customer Service">Customer Service</SelectItem>
                          <SelectItem value="Produce">Produce</SelectItem>
                          <SelectItem value="Bakery">Bakery</SelectItem>
                          <SelectItem value="Deli">Deli</SelectItem>
                          <SelectItem value="Electronics">Electronics</SelectItem>
                          <SelectItem value="Grocery">Grocery</SelectItem>
                          <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Rating Inputs */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-5">
                <h3 className="font-semibold text-lg mb-2">Performance Ratings</h3>
                <RatingInput 
                  label="Overall Rating" 
                  icon={<Star className="h-5 w-5 text-yellow-500" />} 
                  name="overall" 
                />
                <RatingInput 
                  label="Product Knowledge" 
                  icon={<Award className="h-5 w-5 text-blue-500" />} 
                  name="productKnowledge" 
                />
                <RatingInput 
                  label="Job Performance" 
                  icon={<ThumbsUp className="h-5 w-5 text-green-500" />} 
                  name="jobPerformance" 
                />
                <RatingInput 
                  label="Customer Service" 
                  icon={<HeadphonesIcon className="h-5 w-5 text-purple-500" />} 
                  name="customerService" 
                />
                <RatingInput 
                  label="Teamwork" 
                  icon={<Users className="h-5 w-5 text-orange-500" />} 
                  name="teamwork" 
                />
              </div>
              
              {/* Comment */}
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any additional comments about the staff member's performance..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Submitting..." : "Submit Rating"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default RateStaff;
