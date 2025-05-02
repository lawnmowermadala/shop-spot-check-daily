
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
  name: string;  // Changed from 'area' to 'name' to match db schema
  description: string;
  created_at?: string;
}

const Index = () => {
  const [newArea, setNewArea] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [assignedAreas, setAssignedAreas] = useState<Record<string, string>>({});
  const [staffMembers, setStaffMembers] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch staff members on component mount
  useEffect(() => {
    const fetchStaffMembers = async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select('id, name');
      
      if (error) {
        console.error('Error fetching staff members:', error);
        return;
      }
      
      setStaffMembers(data || []);
      // Also store in localStorage for use in handleAssignment
      localStorage.setItem('staffMembers', JSON.stringify(data));
    };
    
    fetchStaffMembers();
  }, []);

  // Fetch areas using a raw approach since the types don't include 'areas' yet
  const { data: areas = [], isLoading, error, refetch } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      try {
        // Cast to any to bypass TypeScript's type checking for the 'areas' table
        const { data, error } = await supabase
          .from('areas' as any)
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        // First cast to unknown, then to Area[] to safely handle the type conversion
        return (data || []) as unknown as Area[];
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
        // Updated to use 'name' instead of 'area' to match the database schema
        const { error } = await supabase
          .from('areas' as any)
          .insert({
            name: newArea.trim(),  // Changed from 'area' to 'name'
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

  const handleAssignment = async (areaName: string, assigneeId: string) => {
    // Get the assignee name from localStorage
    const staffMembersStr = localStorage.getItem('staffMembers');
    const staffMembers = staffMembersStr ? JSON.parse(staffMembersStr) : [];
    const assignee = staffMembers.find((a: any) => a.id === assigneeId);
    
    if (!assignee) return;
    
    try {
      // Generate a UUID for the assignment ID
      const id = crypto.randomUUID();
      
      const { error } = await supabase
        .from('assignments')
        .insert({
          id,
          area: areaName,
          assignee_name: assignee.name,
          assignee_id: assigneeId,
          status: 'needs-check'
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
          <Button onClick={handleAddArea} className="w-full">
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
              area={area.name}  // Changed from area.area to area.name
              description={area.description}
              assignees={staffMembers} // Use the fetched staff members
              onAssign={(assigneeId) => handleAssignment(area.name, assigneeId)}  // Changed from area.area to area.name
              isAssigned={!!assignedAreas[area.name]}  // Changed from area.area to area.name
            />
          ))}
        </div>
      )}
      
      <Navigation />
    </div>
  );
};

export default Index;
