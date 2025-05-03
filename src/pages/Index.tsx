import { useState, useEffect } from 'react';
import ChecklistItem from '@/components/ChecklistItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, parseISO } from 'date-fns';

interface Area {
  id: string;
  name: string;
  description: string;
  created_at?: string;
}

interface StaffMember {
  id: number;
  name: string;
  department_id: number;
  department_name?: string;
}

interface Assignment {
  id?: string;
  area: string;
  assignee_id: number;
  assignee_name: string;
  status: string;
  instructions?: string;
  photo_url?: string | null;
  created_at?: string;
  completed_at?: string | null;
}

const Index = () => {
  const [newArea, setNewArea] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [assignedAreas, setAssignedAreas] = useState<Record<string, Assignment>>({});
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Check date change every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getDate() !== currentDate.getDate()) {
        setCurrentDate(now);
        // Automatically unlock assignments when date changes
        unlockCompletedAssignments();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentDate]);

  // Fetch staff members with department info
  const fetchStaffMembers = async () => {
    setLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          id,
          name,
          department_id,
          departments:department_id (name)
        `)
        .order('name');

      if (error) throw error;

      const formattedStaff = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        department_id: item.department_id,
        department_name: item.departments?.name || 'No Department'
      }));

      setStaffMembers(formattedStaff);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error",
        description: "Failed to load staff members",
        variant: "destructive"
      });
    } finally {
      setLoadingStaff(false);
    }
  };

  // Fetch existing assignments
  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*');

      if (error) throw error;

      const assignmentsMap = (data || []).reduce((acc, assignment) => {
        acc[assignment.area] = assignment;
        return acc;
      }, {} as Record<string, Assignment>);

      setAssignedAreas(assignmentsMap);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive"
      });
    }
  };

  // Unlock completed assignments when day changes or when marked complete
  const unlockCompletedAssignments = async () => {
    try {
      // Get all completed assignments
      const { data: completedAssignments, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('status', 'completed');

      if (error) throw error;

      // Unlock assignments that were completed on previous days
      const assignmentsToUnlock = completedAssignments.filter(assignment => {
        if (!assignment.completed_at) return false;
        const completedDate = parseISO(assignment.completed_at);
        return !isToday(completedDate);
      });

      if (assignmentsToUnlock.length > 0) {
        // Reset status to 'pending' for these assignments
        const { error: updateError } = await supabase
          .from('assignments')
          .update({ status: 'pending', completed_at: null })
          .in('id', assignmentsToUnlock.map(a => a.id));

        if (updateError) throw updateError;

        // Refresh assignments
        await fetchAssignments();
      }
    } catch (error) {
      console.error('Error unlocking assignments:', error);
    }
  };

  useEffect(() => {
    fetchStaffMembers();
    fetchAssignments();
    unlockCompletedAssignments(); // Check for assignments to unlock on initial load
  }, []);

  // Fetch areas using React Query
  const { data: areas = [], isLoading: isLoadingAreas, error: areasError, refetch } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('areas')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data as Area[];
      } catch (err) {
        console.error('Error fetching areas:', err);
        throw err;
      }
    }
  });

  const handleAddArea = async () => {
    if (!newArea.trim() || !newDescription.trim()) {
      toast({
        title: "Warning",
        description: "Please enter both area name and description",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('areas')
        .insert({
          name: newArea.trim(),
          description: newDescription.trim()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "New area added successfully!",
      });

      setNewArea('');
      setNewDescription('');
      refetch();
    } catch (error) {
      console.error('Error adding area:', error);
      toast({
        title: "Error",
        description: "Failed to add area. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAssignment = async (areaName: string, assigneeId: string, instructions: string, photoUrl?: string) => {
    try {
      // Convert assigneeId to number
      const assigneeIdNum = parseInt(assigneeId);
      const assignee = staffMembers.find(staff => staff.id === assigneeIdNum);
      
      if (!assignee) {
        toast({
          title: "Error",
          description: "Invalid staff selection",
          variant: "destructive"
        });
        return;
      }

      const assignmentData: Assignment = {
        area: areaName,
        assignee_id: assigneeIdNum,
        assignee_name: assignee.name,
        status: 'pending',
        instructions: instructions || null,
        photo_url: photoUrl || null,
        completed_at: null
      };

      // Check if assignment exists
      const existingAssignment = assignedAreas[areaName];
      
      let operation;
      if (existingAssignment?.id) {
        // Update existing assignment
        const { error } = await supabase
          .from('assignments')
          .update(assignmentData)
          .eq('id', existingAssignment.id);
        operation = 'updated';
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('assignments')
          .insert(assignmentData)
          .select();
        operation = 'created';
      }

      // Refresh assignments
      await fetchAssignments();

      toast({
        title: "Success",
        description: `Area assignment ${operation} successfully!`,
      });
    } catch (error) {
      console.error('Error assigning area:', error);
      toast({
        title: "Error",
        description: `Failed to assign area: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleCompleteAssignment = async (areaName: string) => {
    try {
      const assignment = assignedAreas[areaName];
      if (!assignment?.id) return;

      // Mark as completed with current timestamp
      const { error } = await supabase
        .from('assignments')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString() 
        })
        .eq('id', assignment.id);

      if (error) throw error;

      // Refresh assignments
      await fetchAssignments();

      toast({
        title: "Success",
        description: "Area marked as completed!",
      });
    } catch (error) {
      console.error('Error completing assignment:', error);
      toast({
        title: "Error",
        description: "Failed to mark area as completed",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6 text-center">Daily Shop Check</h1>
      <p className="text-gray-600 mb-6 text-center">
        {currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </p>

      {/* Add New Area Form */}
      <div className="mb-6 space-y-2">
        <h2 className="text-lg font-semibold">Add New Area</h2>
        <div className="space-y-2">
          <Input
            placeholder="Area name..."
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
          />
          <Input
            placeholder="Description..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <Button 
            onClick={handleAddArea} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!newArea.trim() || !newDescription.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Area
          </Button>
        </div>
      </div>
      
      {/* Areas List */}
      {isLoadingAreas ? (
        <div className="text-center py-4">Loading areas...</div>
      ) : areasError ? (
        <div className="text-center py-4 text-red-500">Failed to load areas</div>
      ) : (
        <div className="space-y-4">
          {areas.length > 0 ? (
            areas.map((area) => {
              const assignment = assignedAreas[area.name];
              const isAssigned = !!assignment;
              const isCompleted = assignment?.status === 'completed';
              const assignedStaff = isAssigned 
                ? staffMembers.find(staff => staff.id === assignment.assignee_id)
                : null;

              return (
                <ChecklistItem
                  key={area.id}
                  area={area.name}
                  description={area.description}
                  assignees={staffMembers}
                  onAssign={(assigneeId, instructions, photoUrl) => 
                    handleAssignment(area.name, assigneeId, instructions, photoUrl)
                  }
                  onComplete={() => handleCompleteAssignment(area.name)}
                  isAssigned={isAssigned}
                  isCompleted={isCompleted}
                  assignedTo={assignedStaff?.name}
                  canReassign={isCompleted}
                />
              );
            })
          ) : (
            <div className="text-center py-4 text-gray-500">
              No areas found. Add your first area above.
            </div>
          )}
        </div>
      )}
      
      <Navigation />
    </div>
  );
};

export default Index;
