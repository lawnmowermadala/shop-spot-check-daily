import { useState, useEffect } from 'react';
import ChecklistItem from '@/components/ChecklistItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import IncompleteAssignmentsCarousel from '@/components/IncompleteAssignmentsCarousel';

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
  isPreviousDay?: boolean;
}

const Index = () => {
  const [newArea, setNewArea] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [assignedAreas, setAssignedAreas] = useState<Assignment[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [todaysAssignmentCount, setTodaysAssignmentCount] = useState(0);
  const [recentlyAssigned, setRecentlyAssigned] = useState<string[]>([]);
  const [incompleteAssignments, setIncompleteAssignments] = useState<Assignment[]>([]);

  // Fetch staff members
  const fetchStaffMembers = async () => {
    setLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, department_id, departments:department_id (name)')
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

  // Fetch assignments
  const fetchAssignments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: allAssignments, error: allError } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (allError) throw allError;

      // Filter assignments that are no older than one day
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      oneDayAgo.setHours(0, 0, 0, 0);
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const recentAssignments = allAssignments?.filter(assignment => {
        if (!assignment.created_at) return true;
        const assignmentDate = new Date(assignment.created_at);
        return assignmentDate >= oneDayAgo && assignment.status !== 'done';
      }) || [];
      
      // Add flag for previous day assignments
      const processedAssignments = recentAssignments.map(assignment => {
        const assignmentDate = new Date(assignment.created_at || '');
        const isPreviousDay = assignmentDate < todayStart && assignmentDate >= oneDayAgo;
        return { ...assignment, isPreviousDay };
      });

      // Filter incomplete assignments (not 'done' or 'completed')
      const incomplete = processedAssignments.filter(assignment => 
        assignment.status !== 'done' && assignment.status !== 'completed'
      );

      const { count, error: countError } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (countError) throw countError;

      setTodaysAssignmentCount(count || 0);
      setAssignedAreas(processedAssignments);
      setIncompleteAssignments(incomplete);
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

  // Areas query
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
        photo_url: photoUrl || null
      };

      setRecentlyAssigned(prev => [...prev, areaName]);
      
      setTimeout(() => {
        setRecentlyAssigned(prev => prev.filter(area => area !== areaName));
      }, 1000);

      const { error } = await supabase
        .from('assignments')
        .insert(assignmentData)
        .select();

      if (error) throw error;

      await fetchAssignments();

      toast({
        title: "Success",
        description: `Task assigned to ${assignee.name}!`,
      });
    } catch (error) {
      console.error('Error assigning area:', error);
      toast({
        title: "Error",
        description: `Assignment failed: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const getAreaAssignments = (areaName: string) => {
    return assignedAreas.filter(assignment => assignment.area === areaName);
  };

  const isRecentlyAssigned = (areaName: string) => {
    return recentlyAssigned.includes(areaName);
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

      <div className="mb-6 bg-blue-50 p-3 rounded-lg">
        <p className="text-sm text-center">
          Today's assignments: <span className="font-semibold">{todaysAssignmentCount}</span>
        </p>
        
        {assignedAreas.some(a => a.isPreviousDay) && (
          <div className="mt-2 p-2 bg-yellow-100 rounded-md">
            <p className="text-xs text-center text-amber-800 font-medium">
              There are incomplete assignments from yesterday highlighted below
            </p>
          </div>
        )}
      </div>

      {/* Add the incomplete assignments carousel */}
      {incompleteAssignments.length > 0 && (
        <IncompleteAssignmentsCarousel assignments={incompleteAssignments} />
      )}

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
      
      {isLoadingAreas ? (
        <div className="text-center py-4">Loading areas...</div>
      ) : areasError ? (
        <div className="text-center py-4 text-red-500">Failed to load areas</div>
      ) : (
        <div className="space-y-4">
          {areas.length > 0 ? (
            areas.map((area) => {
              const areaAssignments = getAreaAssignments(area.name);
              const hasPreviousDayAssignment = areaAssignments.some(a => a.isPreviousDay);

              return (
                <div 
                  key={area.id} 
                  className={`${hasPreviousDayAssignment ? 'border-l-4 border-amber-500 pl-2 bg-amber-50' : ''} 
                              transition-all duration-200`}
                >
                  {hasPreviousDayAssignment && (
                    <Badge variant="outline" className="mb-2 text-amber-700 bg-amber-100 border-amber-200">
                      Pending from yesterday
                    </Badge>
                  )}
                  <ChecklistItem
                    area={area.name}
                    description={area.description}
                    assignees={staffMembers}
                    onAssign={(assigneeId, instructions, photoUrl) => 
                      handleAssignment(area.name, assigneeId, instructions, photoUrl)
                    }
                    isAssigned={false}
                    assignedTo={areaAssignments.map(a => a.assignee_name).join(', ')}
                    assignmentCount={areaAssignments.length}
                    isRecentlyAssigned={isRecentlyAssigned(area.name)}
                  />
                </div>
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
