
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
import { Button } from "@/components/ui/button";
import { Check, Clock, CirclePlay, X, AlertTriangle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

type Assignment = {
  id: string;
  area: string;
  assignee_name: string;
  assignee_id: number;
  status: 'pending' | 'needs-check' | 'in-progress' | 'done' | 'incomplete';
  created_at: string;
  instructions?: string;
  photo_url?: string;
}

const statusIcons = {
  'pending': <AlertTriangle className="h-5 w-5 text-orange-500" />,
  'needs-check': <CirclePlay className="h-5 w-5 text-yellow-500" />,
  'in-progress': <Clock className="h-5 w-5 text-blue-500" />,
  'done': <Check className="h-5 w-5 text-green-500" />,
  'incomplete': <X className="h-5 w-5 text-red-500" />
};

const Assignments = () => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'needs-check' | 'in-progress' | 'done' | 'incomplete'>('all');

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Assignment[];
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      throw error;
    }
  };

  const { data: assignments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['assignments'],
    queryFn: fetchAssignments,
    retry: 1
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error Loading Assignments",
        description: error.message || "Please check your connection and try again.",
        variant: "destructive",
        action: (
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        )
      });
    }
  }, [error, refetch]);

  const updateAssignmentStatus = async (id: string, status: Assignment['status']) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      await refetch();
      
      toast({
        title: "Status Updated",
        description: `Assignment marked as ${status.replace('-', ' ')}`,
      });
    } catch (err) {
      console.error('Error updating status:', err);
      toast({
        title: "Update Failed",
        description: "Couldn't update status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const clearAssignment = async (id: string) => {
    try {
      // First check if the assignment can be cleared (only pending status)
      const { data, error: fetchError } = await supabase
        .from('assignments')
        .select('status')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (data.status !== 'pending') {
        toast({
          title: "Cannot Clear Assignment",
          description: "Only pending assignments can be cleared. Assignments that have been started, completed or marked as incomplete cannot be deleted.",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await refetch();
      
      toast({
        title: "Assignment Cleared",
        description: "The pending assignment has been removed",
      });
    } catch (err) {
      console.error('Error clearing assignment:', err);
      toast({
        title: "Clear Failed",
        description: "Couldn't clear assignment. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const filteredAssignments = filter === 'all' 
    ? assignments 
    : assignments.filter(assignment => assignment.status === filter);

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Job Assignments</h1>
      
      <div className="flex flex-wrap gap-2 mb-6">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          onClick={() => setFilter('all')}
          size="sm"
        >
          All
        </Button>
        <Button 
          variant={filter === 'pending' ? 'default' : 'outline'} 
          onClick={() => setFilter('pending')}
          size="sm"
        >
          Pending
        </Button>
        <Button 
          variant={filter === 'needs-check' ? 'default' : 'outline'} 
          onClick={() => setFilter('needs-check')}
          size="sm"
        >
          Needs Check
        </Button>
        <Button 
          variant={filter === 'in-progress' ? 'default' : 'outline'} 
          onClick={() => setFilter('in-progress')}
          size="sm"
        >
          In Progress
        </Button>
        <Button 
          variant={filter === 'done' ? 'default' : 'outline'} 
          onClick={() => setFilter('done')}
          size="sm"
        >
          Completed
        </Button>
        <Button 
          variant={filter === 'incomplete' ? 'default' : 'outline'} 
          onClick={() => setFilter('incomplete')}
          size="sm"
        >
          Incomplete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      Loading assignments...
                    </TableCell>
                  </TableRow>
                ) : filteredAssignments.length > 0 ? (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.area}</TableCell>
                      <TableCell>{assignment.assignee_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusIcons[assignment.status]}
                          <span className="capitalize">
                            {assignment.status.replace('-', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(assignment.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {assignment.status !== 'in-progress' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateAssignmentStatus(assignment.id, 'in-progress')}
                            >
                              Start
                            </Button>
                          )}
                          {assignment.status !== 'done' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateAssignmentStatus(assignment.id, 'done')}
                              className="bg-green-50 hover:bg-green-100 text-green-600"
                            >
                              Complete
                            </Button>
                          )}
                          {assignment.status !== 'incomplete' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateAssignmentStatus(assignment.id, 'incomplete')}
                              className="bg-red-50 hover:bg-red-100 text-red-600"
                            >
                              Incomplete
                            </Button>
                          )}
                          {assignment.status === 'pending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => clearAssignment(assignment.id)}
                              className="bg-gray-50 hover:bg-gray-100 text-gray-600"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      {assignments.length === 0 ? "No assignments found" : "No assignments match this filter"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default Assignments;
