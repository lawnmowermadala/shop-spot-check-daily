
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CirclePause, CirclePlay, CircleCheck, Star } from 'lucide-react';
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
  const [rating, setRating] = useState<number>(0);
  const [showRating, setShowRating] = useState(false);

  const handleAssigneeChange = (id: string) => {
    setAssigneeId(id);
    onAssign(id);
    
    // When a task is assigned, create/update an assignment record in localStorage
    const assignments = JSON.parse(localStorage.getItem('assignments') || '[]');
    const selectedAssignee = assignees.find(a => a.id === id);
    
    if (selectedAssignee) {
      const newAssignment = {
        id: `${area}-${Date.now()}`,
        area: area,
        assignee: selectedAssignee.name,
        assigneeId: selectedAssignee.id,
        status: status,
        assignedDate: new Date().toISOString().split('T')[0]
      };
      
      const existingAssignmentIndex = assignments.findIndex(
        (a: any) => a.area === area && a.status !== 'done'
      );
      
      if (existingAssignmentIndex !== -1) {
        assignments[existingAssignmentIndex] = newAssignment;
      } else {
        assignments.push(newAssignment);
      }
      
      localStorage.setItem('assignments', JSON.stringify(assignments));
      
      // Save staff members to localStorage for other components to use
      localStorage.setItem('staffMembers', JSON.stringify(assignees));
    }
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
    const newStatus = statuses[nextIndex];
    setStatus(newStatus);
    
    // If the status changes to done, prompt for a rating
    if (newStatus === 'done' && assigneeId) {
      setShowRating(true);
    }
    
    // Update the assignment status in localStorage
    if (assigneeId) {
      const assignments = JSON.parse(localStorage.getItem('assignments') || '[]');
      const assignmentIndex = assignments.findIndex(
        (a: any) => a.area === area && a.assigneeId === assigneeId
      );
      
      if (assignmentIndex !== -1) {
        assignments[assignmentIndex].status = newStatus;
        localStorage.setItem('assignments', JSON.stringify(assignments));
      }
    }
  };
  
  const handleRating = (value: number) => {
    setRating(value);
    
    // Save the rating to localStorage
    if (assigneeId) {
      const ratings = JSON.parse(localStorage.getItem('ratings') || '[]');
      const selectedAssignee = assignees.find(a => a.id === assigneeId);
      
      if (selectedAssignee) {
        const newRating = {
          staffId: assigneeId,
          staffName: selectedAssignee.name,
          area: area,
          rating: value,
          date: new Date().toISOString().split('T')[0],
          comment: comment
        };
        
        ratings.push(newRating);
        localStorage.setItem('ratings', JSON.stringify(ratings));
      }
    }
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

        {showRating && status === 'done' && (
          <div className="mb-4">
            <p className="mb-2 font-medium">Rate task completion:</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  variant="ghost"
                  className="p-1"
                  onClick={() => handleRating(value)}
                >
                  <Star 
                    className={`h-6 w-6 ${rating >= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                  />
                </Button>
              ))}
            </div>
          </div>
        )}

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
