
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
import { Check, Clock, CirclePlay } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

type Assignment = {
  id: string;
  area: string;
  assignee_name: string;
  assignee_id: string;
  status: 'needs-check' | 'in-progress' | 'done';
  assigned_date: string;
}

const statusIcons = {
  'needs-check': <CirclePlay className="h-5 w-5 text-yellow-500" />,
  'in-progress': <Clock className="h-5 w-5 text-blue-500" />,
  'done': <Check className="h-5 w-5 text-green-500" />
};

const Assignments = () => {
  const [filter, setFilter] = useState<'all' | 'needs-check' | 'in-progress' | 'done'>('all');

  // Fetch assignments from Supabase
  const { data: assignments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .order('assigned_date', { ascending: false });
      
      if (error) throw error;
      return data as Assignment[];
    }
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load assignments. Please try again.",
        variant: "destructive"
      });
    }
  }, [error]);

  // Update assignment status
  const updateAssignmentStatus = async (id: string, status: Assignment['status']) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      refetch();
      
      toast({
        title: "Status updated",
        description: `Assignment status changed to ${status.replace('-', ' ')}`,
      });
    } catch (err) {
      console.error('Error updating assignment status:', err);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
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
                        {new Date(assignment.assigned_date).toLocaleDateString()}
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
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No assignments found
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
