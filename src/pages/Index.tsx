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
  id: string;
  name: string;
  department_name?: string;
}

const Index = () => {
  const [newArea, setNewArea] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [assignedAreas, setAssignedAreas] = useState<Record<string, string>>({});
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  // Enhanced staff fetching with proper error handling
  const fetchStaffMembers = async () => {
    setIsLoadingStaff(true);
    try {
      console.log('[DEBUG] Fetching staff members from Supabase...');
      
      const { data, error } = await supabase
        .from('staff_members')
        .select(`
          id,
          name,
          departments:department_id (name)
        `)
        .order('name', { ascending: true });

      console.log('[DEBUG] Staff members response:', { data, error });

      if (error) {
        console.error('[ERROR] Staff fetch error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('[WARNING] No staff members found in database');
        throw new Error('No staff members available');
      }

      const formattedStaff = data.map(member => ({
        id: member.id,
        name: member.name,
        department_name: member.departments?.name || 'No Department'
      }));

      console.log('[DEBUG] Formatted staff:', formattedStaff);
      setStaffMembers(formattedStaff);
      return formattedStaff;

    } catch (error) {
      console.error('[ERROR] Failed to load staff:', error);
      toast({
        title: "Staff Loading Failed",
        description: "Couldn't load staff list. Please try again.",
        variant: "destructive"
      });
      setStaffMembers([]);
      return [];
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchStaffMembers();
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
        return (data || []) as Area[];
      } catch (err) {
        console.error('Error fetching areas:', err);
        throw err;
      }
    }
  });

  useEffect(() => {
    if (areasError) {
      toast({
        title: "Error",
        description: "Failed to load areas. Please try again.",
        variant: "destructive"
      });
    }
  }, [areasError]);

  const handleAddArea = async () => {
    if (!newArea.trim() || !newDescription.trim()) {
      toast({
        title: "Warning",
        description: "Please enter both area name and description.",
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
      console.log('[DEBUG] Assigning area:', { areaName, assigneeId, instructions, photoUrl });
      
      const assignee = staffMembers.find(staff => staff.id === assigneeId);
      
      if (!assignee) {
        toast({
          title: "Error",
          description: "Invalid staff selection",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase
        .from('assignments')
        .insert({
          area: areaName,
          assignee_name: assignee.name,
          assignee_id: assigneeId,
          status: 'needs-check',
          instructions: instructions,
          photo_url: photoUrl || null
        });
      
      if (error) throw error;
      
      setAssignedAreas(prev => ({
        ...prev,
        [areaName]: assigneeId
      }));
      
      toast({
        title: "Success",
        description: `Area assigned to ${assignee.name}`,
      });
    } catch (error) {
      console.error('[ERROR] Assignment failed:', error);
      toast({
        title: "Error",
        description: "Failed to assign area. Please try again.",
        variant: "destructive"
      });
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

      {/* Area Form */}
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
            areas.map((area) => (
              <ChecklistItem
                key={area.id}
                area={area.name}
                description={area.description}
                assignees={staffMembers}
                onAssign={(assigneeId, instructions, photoUrl) => 
                  handleAssignment(area.name, assigneeId, instructions, photoUrl)
                }
                isAssigned={!!assignedAreas[area.name]}
              />
            ))
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
