
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from 'lucide-react';

interface AreaManagerProps {
  areas: Array<{ area: string; description: string }>;
  onAddArea: (area: string, description: string) => void;
}

const AreaManager: React.FC<AreaManagerProps> = ({ areas, onAddArea }) => {
  const [newArea, setNewArea] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleAddArea = () => {
    if (newArea.trim() && newDescription.trim()) {
      onAddArea(newArea.trim(), newDescription.trim());
      setNewArea('');
      setNewDescription('');
    }
  };

  return (
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
  );
};

export default AreaManager;
