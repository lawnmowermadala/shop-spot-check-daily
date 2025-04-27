
import { useState } from 'react';
import ChecklistItem from '@/components/ChecklistItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus } from 'lucide-react';
import AreaManager from '@/components/AreaManager';
import Navigation from '@/components/Navigation';

interface Area {
  area: string;
  description: string;
}

const initialShopAreas: Area[] = [
  {
    area: "Front Entrance",
    description: "Check cleanliness of entrance area, windows, and door handles"
  },
  {
    area: "Cash Register Area",
    description: "Ensure counter is clean and organized, check register functionality"
  },
  {
    area: "Display Windows",
    description: "Check for cleanliness, proper product arrangement, and lighting"
  },
  {
    area: "Fitting Rooms",
    description: "Inspect mirrors, hooks, and general cleanliness"
  },
  {
    area: "Main Floor",
    description: "Check aisles, product displays, and floor cleanliness"
  },
  {
    area: "Storage Room",
    description: "Verify organization, cleanliness, and inventory arrangement"
  },
  {
    area: "Break Room",
    description: "Check cleanliness, supplies, and equipment functionality"
  },
  {
    area: "Restrooms",
    description: "Inspect cleanliness, supplies, and functionality"
  },
  {
    area: "Back Office",
    description: "Check organization, cleanliness, and equipment"
  },
  {
    area: "Outdoor Area",
    description: "Inspect sidewalk, parking area, and exterior cleanliness"
  }
];

const Index = () => {
  const [areas, setAreas] = useState<Area[]>(initialShopAreas);
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const [assignedAreas, setAssignedAreas] = useState<Record<string, string>>({});

  const handleAddAssignee = () => {
    if (newAssigneeName.trim()) {
      const newAssignee = { 
        id: Date.now().toString(), 
        name: newAssigneeName.trim() 
      };
      
      setAssignees([...assignees, newAssignee]);
      setNewAssigneeName('');
      
      // Store staff members in localStorage for use by other components
      const updatedAssignees = [...assignees, newAssignee];
      localStorage.setItem('staffMembers', JSON.stringify(updatedAssignees));
    }
  };

  const handleAddArea = (area: string, description: string) => {
    const newAreas = [...areas, { area, description }];
    setAreas(newAreas);
    // The localStorage update is handled in the AreaManager component
  };

  const handleAssignment = (areaName: string, assigneeId: string) => {
    setAssignedAreas(prev => ({
      ...prev,
      [areaName]: assigneeId
    }));
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

      <div className="mb-6 space-y-2">
        <h2 className="text-lg font-semibold">Staff Members</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Add staff member..."
            value={newAssigneeName}
            onChange={(e) => setNewAssigneeName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddAssignee()}
          />
          <Button onClick={handleAddAssignee} variant="outline">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
        {assignees.length > 0 && (
          <div className="text-sm text-gray-600">
            Staff: {assignees.map(a => a.name).join(', ')}
          </div>
        )}
      </div>

      <AreaManager areas={areas} onAddArea={handleAddArea} />
      
      <div className="space-y-4">
        {areas.map((area, index) => (
          <ChecklistItem
            key={index}
            area={area.area}
            description={area.description}
            assignees={assignees}
            onAssign={(assigneeId) => handleAssignment(area.area, assigneeId)}
            isAssigned={!!assignedAreas[area.area]}
          />
        ))}
      </div>
      
      <Navigation />
    </div>
  );
};

export default Index;
