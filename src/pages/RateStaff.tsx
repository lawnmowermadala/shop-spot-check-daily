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

const ratingSchema = z.object({
  staffId: z.string().min(1, { message: "Please select a staff member" }),
  overall: z.number().min(1).max(5),
  productKnowledge: z.number().min(1).max(5),
  jobPerformance: z.number().min(1).max(5),
  customerService: z.number().min(1).max(5),
  teamwork: z.number().min(1).max(5),
  comment: z.string().optional(),
});

type RatingFormValues = z.infer<typeof ratingSchema>;

type StaffMember = {
  id: number;
  name: string;
  department_name?: string;
};

const RateStaff = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const form = useForm<RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      staffId: '',
      overall: 0,
      productKnowledge: 0,
      jobPerformance: 0,
      customerService: 0,
      teamwork: 0,
      comment: '',
    },
  });

  useEffect(() => {
    const fetchStaffMembers = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('staff')
          .select(`
            id,
            name,
            departments:department_id (name)
          `);
          
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        const mappedStaff = data?.map(item => ({
          id: item.id,
          name: item.name,
          department_name: item.departments?.name || 'No Department'
        })) || [];

        console.log('Fetched staff members:', mappedStaff);
        setStaffMembers(mappedStaff);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast({
          title: "Error",
          description: "Could not fetch staff members",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStaffMembers();
  }, [toast]);

  const RatingInput = ({ 
    label, 
    icon, 
    name 
  }: { 
    label: string; 
    icon: JSX.Element; 
    name: keyof RatingFormValues; 
  }) => {
    const value = form.watch(name) as number;
    
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
                    variant={value >= rating ? "default" : "ghost"}
                    className="p-1 h-8"
                    onClick={() => field.onChange(rating)}
                  >
                    <Star 
                      className={`h-5 w-5 ${
                        value >= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
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

 const onSubmit = async (data: RatingFormValues) => {
  setIsLoading(true);
  
  try {
    const selectedStaff = staffMembers.find(staff => staff.id.toString() === data.staffId);
    
    if (!selectedStaff) {
      throw new Error("Selected staff member not found");
    }

  const submissionData = {
  staff_id: data.staffId,
  staff_name: selectedStaff.name,
  overall: data.overall,
  product_knowledge: data.productKnowledge,
  job_performance: data.jobPerformance,
  customer_service: data.customerService,
  teamwork: data.teamwork,
  comment: data.comment || null,
  rating_date: new Date().toISOString()
};

    console.log('Final submission data:', submissionData);

    const { error } = await supabase
      .from('ratings')
      .insert(submissionData);

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    toast({ title: "Success", description: "Rating submitted successfully!" });
    form.reset();
    navigate('/ratings');
  } catch (error) {
    console.error('Full error:', error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to submit rating",
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
              <FormField
                control={form.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        console.log('Selected staff ID:', value);
                        field.onChange(value);
                      }}
                      value={field.value}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id.toString()}>
                            {staff.name} {staff.department_name && `(${staff.department_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
              
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any additional comments..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
