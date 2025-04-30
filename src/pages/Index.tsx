
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
  area: string;
  description: string;
  created_at?: string;
}

const Index = () => {
  const [newArea, setNewArea] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [assignedAreas, setAssignedAreas] = useState<Record<string, string>>({});

  // Fetch areas using a raw approach since the types don't include 'areas' yet
  const { data: areas = [], isLoading, error, refetch } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      // Using any here since the types don't yet include the areas table
      const { data, error } = await supabase
        .from('areas' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Area[];
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
        // Using any here since the types don't yet include the areas table
        const { error } = await supabase
          .from('areas' as any)
          .insert({
            area: newArea.trim(), 
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
      // For assignments table, we need to generate an ID since it's required but not auto-generated in insert
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
              area={area.area}
              description={area.description}
              assignees={[]} // Will be populated from localStorage
              onAssign={(assigneeId) => handleAssignment(area.area, assigneeId)}
              isAssigned={!!assignedAreas[area.area]}
            />
          ))}
        </div>
      )}
      
      <Navigation />
    </div>
  );
};

export default Index;
