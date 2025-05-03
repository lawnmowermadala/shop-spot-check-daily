import { useState, useEffect } from 'react';
import ChecklistItem from '@/components/ChecklistItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

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
}

const Index = () => {
  const [newArea, setNewArea] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [assignedAreas, setAssignedAreas] = useState<Record<string, Assignment>>({});
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [todaysAssignmentCount, setTodaysAssignmentCount] = useState(0);
  const [currentlyAssigning, setCurrentlyAssigning] = useState<string | null>(null);

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

  // Fetch existing assignments and count today's assignments
  const fetchAssignments = async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch all assignments
      const { data: allAssignments, error: allError } = await supabase
        .from('assignments')
        .select('*');

      if (allError) throw allError;

      // Count today's assignments
      const { count, error: countError } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (countError) throw countError;

      setTodaysAssignmentCount(count || 0);

      const assignmentsMap = (allAssignments || []).reduce((acc, assignment) => {
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

  useEffect(() => {
    fetchStaffMembers();
    fetchAssignments();
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

      // Clear the form fields
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
      setCurrentlyAssigning(areaName); // Lock the area while assigning
      
      // Convert assigneeId to number (since staff.id is number in your schema)
      const assigneeIdNum = parseInt(assigneeId);
      const assignee = staffMembers.find(staff => staff.id === assigneeIdNum);
      
      if (!assignee) {
        toast({
          title: "Error",
          description: "Invalid staff selection",
          variant: "destructive"
        });
        setCurrentlyAssigning(null); // Unlock if error
        return;
      }

      const assignmentData: Assignment = {
        area: areaName,
        assignee_id: assigneeIdNum,
        assignee_name: assignee.name,
        status: 'pending',
        instructions: instructions || null,
        photo_url: photoUrl || null
      };

      // Always create a new assignment (don't update existing ones)
      const { error } = await supabase
        .from('assignments')
        .insert(assignmentData)
        .select();

      if (error) throw error;

      // Refresh assignments and count
      await fetchAssignments();

      toast({
        title: "Success",
        description: `Area assigned successfully to ${assignee.name}!`,
      });
    } catch (error) {
      console.error('Error assigning area:', error);
      toast({
        title: "Error",
        description: `Failed to assign area: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setCurrentlyAssigning(null); // Unlock the area after assignment
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6 text-center">Daily Shop Check</h1>
      <p className="text-gray-600 mb-6 text-center">
        {new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </p>

      {/* Today's assignment count */}
      <div className="mb-4 text-center">
        <p className="text-sm text-gray-500">
          Today's assignments: <span className="font-semibold">{todaysAssignmentCount}</span>
        </p>
      </div>

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
                  isAssigned={isAssigned}
                  assignedTo={assignedStaff?.name}
                  isCurrentlyAssigning={currentlyAssigning === area.name}
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
