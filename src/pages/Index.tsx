
import { useState, useEffect } from 'react';
import ChecklistItem from '@/components/ChecklistItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

// Define the Area interface to match what we expect from the database
interface Area {
  id: string;
  name: string;
  description: string;
  created_at?: string;
}

const Index = () => {
  const [newArea, setNewArea] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [assignedAreas, setAssignedAreas] = useState<Record<string, string>>({});
  const [staffMembers, setStaffMembers] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch staff members directly from Supabase
  useEffect(() => {
    const fetchStaffMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('staff_members')
          .select('id, name');
        
        if (error) {
          console.error('Error fetching staff members:', error);
          toast({
            title: "Error",
            description: "Failed to load staff members",
            variant: "destructive"
          });
          return;
        }
        
        console.log('Fetched staff members in Index:', data);
        setStaffMembers(data || []);
      } catch (err) {
        console.error('Exception fetching staff in Index:', err);
      }
    };
    
    fetchStaffMembers();
  }, []);

  // Fetch areas using React Query
  const { data: areas = [], isLoading, error, refetch } = useQuery({
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
        return [] as Area[];
      }
    }
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load areas. Please try again.",
        variant: "destructive"
      });
    }
  }, [error]);

  const handleAddArea = async () => {
    if (newArea.trim() && newDescription.trim()) {
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

        // Clear inputs and refresh data
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
    } else {
      toast({
        title: "Warning",
        description: "Please enter both area name and description.",
        variant: "destructive"
      });
    }
  };

  const handleAssignment = async (areaName: string, assigneeId: string, instructions: string, photoUrl?: string) => {
    try {
      console.log('Assignment data:', { areaName, assigneeId, instructions, photoUrl });
      console.log('Staff members available:', staffMembers);
      
      // Get the assignee name from staffMembers state
      const assignee = staffMembers.find((staff) => staff.id === assigneeId);
      
      if (!assignee) {
        toast({
          title: "Error",
          description: "Invalid staff selection",
          variant: "destructive"
        });
        return;
      }
      
      // Generate a UUID for the assignment ID
      const id = crypto.randomUUID();
      
      const { error } = await supabase
        .from('assignments')
        .insert({
          id,
          area: areaName,
          assignee_name: assignee.name,
          assignee_id: assigneeId,
          status: 'needs-check',
          instructions: instructions,
          photo_url: photoUrl || null
        });
      
      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      
      setAssignedAreas(prev => ({
        ...prev,
        [areaName]: assigneeId
      }));
      
      toast({
        title: "Success",
        description: `Area assigned to ${assignee.name}`,
      });
    } catch (error) {
      console.error('Error assigning area:', error);
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

      {/* Area Form - Now at the top */}
      <div className="mb-6 space-y-2">
        <h2 className="text-lg font-semibold">Add New Area</h2>
        <div className="space-y-2">
          <Input
            placeholder="Area name..."
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            className="mb-2"
          />
          <Input
            placeholder="Description..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <Button onClick={handleAddArea} className="w-full bg-slate-900">
            <Plus className="h-4 w-4 mr-2" />
            Add Area
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-4">Loading areas...</div>
      ) : (
        <div className="space-y-4">
          {areas.map((area) => (
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
          ))}
        </div>
      )}
      
      <Navigation />
    </div>
  );
};

export default Index;
