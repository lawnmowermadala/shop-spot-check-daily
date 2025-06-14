import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCheck, User, X } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useLocation } from "react-router-dom";

interface Assignment {
  id?: string;
  area: string;
  assignee_id: number;
  assignee_name: string;
  status: string;
  instructions?: string;
  photo_url?: string | null;
  created_at?: string;
  isPreviousDay?: boolean;
}

const Assignments = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const assignmentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleComplete = async (assignmentId: string | undefined) => {
    if (!assignmentId) {
      toast({
        title: "Error",
        description: "Invalid assignment ID",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('assignments')
        .update({ status: 'done' })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment marked as complete!",
      });

      fetchAssignments();
    } catch (error) {
      console.error('Error completing assignment:', error);
      toast({
        title: "Error",
        description: "Failed to complete assignment",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (assignmentId: string | undefined) => {
    if (!assignmentId) {
      toast({
        title: "Error",
        description: "Invalid assignment ID",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment deleted successfully!",
      });

      fetchAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive"
      });
    }
  };

  // NEW: Try focus/scroll to assignment if 'id' param in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const scrollId = params.get('id');
    if (scrollId && assignmentRefs.current[scrollId]) {
      assignmentRefs.current[scrollId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      assignmentRefs.current[scrollId]?.focus?.();
    }
  }, [location.search, assignments]);

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6 text-center">Assignments</h1>
      
      {loading ? (
        <div className="text-center py-4">Loading assignments...</div>
      ) : (
        <div className="space-y-4">
          {assignments.length > 0 ? (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                ref={el => {
                  if (assignment.id) assignmentRefs.current[assignment.id] = el;
                }}
                tabIndex={-1}
                className="outline-none"
              >
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-blue-600">{assignment.area}</h3>
                        <p className="text-gray-600 text-sm">
                          Assigned to: {assignment.assignee_name}
                        </p>
                        {assignment.instructions && (
                          <p className="text-gray-500 text-sm mt-1">
                            Instructions: {assignment.instructions}
                          </p>
                        )}
                        {assignment.photo_url && (
                          <div className="mt-2">
                            <img
                              src={assignment.photo_url}
                              alt="Assignment"
                              className="rounded-md object-cover w-full max-h-[150px]"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => handleComplete(assignment.id)}
                          className="mb-2"
                        >
                          <CheckCheck className="h-4 w-4 mr-2" />
                          Complete
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <X className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the assignment from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(assignment.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              No assignments found.
            </div>
          )}
        </div>
      )}
      
      <Navigation />
    </div>
  );
};

export default Assignments;
