import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CirclePause, CirclePlay, CircleCheck } from 'lucide-react';
import AssigneeSelect from './AssigneeSelect';

interface ChecklistItemProps {
  area: string;
  description: string;
  assignees: { id: string; name: string }[];
  onAssign: (assigneeId: string) => void;
  isAssigned: boolean;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({ 
  area, 
  description, 
  assignees,
  onAssign,
  isAssigned
}) => {
  const [status, setStatus] = useState<'needs-check' | 'in-progress' | 'done'>('needs-check');
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState('');

  const handleAssigneeChange = (id: string) => {
    setAssigneeId(id);
    onAssign(id);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'needs-check':
        return <CirclePlay className="h-6 w-6" />;
      case 'in-progress':
        return <CirclePause className="h-6 w-6" />;
      case 'done':
        return <CircleCheck className="h-6 w-6" />;
    }
  };

  const cycleStatus = () => {
    const statuses: ('needs-check' | 'in-progress' | 'done')[] = ['needs-check', 'in-progress', 'done'];
    const currentIndex = statuses.indexOf(status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    setStatus(statuses[nextIndex]);
  };

  return (
    <Card className="mb-4 p-4">
      <div className={`status-${status} rounded-lg p-4 border`}>
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="text-lg font-semibold">{area}</h3>
            {isAssigned && (
              <span className="text-xs text-green-600 font-medium">
                Assigned for today
              </span>
            )}
          </div>
          <Button variant="ghost" onClick={cycleStatus}>
            {getStatusIcon()}
          </Button>
        </div>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        
        <AssigneeSelect
          value={assigneeId}
          onChange={handleAssigneeChange}
          assignees={assignees}
        />

        <Textarea
          placeholder="Add your comments here..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mb-4"
        />

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" className="w-full">
              <label>
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </Button>
          </div>
          {photoUrl && (
            <div className="mt-4">
              <img src={photoUrl} alt="Uploaded" className="rounded-lg max-h-48 w-full object-cover" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ChecklistItem;
