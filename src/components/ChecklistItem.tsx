
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CirclePause, CirclePlay, CircleCheck, Star, Award, ThumbsUp, CustomerService, Users } from 'lucide-react';
import AssigneeSelect from './AssigneeSelect';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

interface ChecklistItemProps {
  area: string;
  description: string;
  assignees: { id: string; name: string }[];
  onAssign: (assigneeId: string) => void;
  isAssigned: boolean;
}

type RatingAspect = {
  name: string;
  icon: JSX.Element;
  value: number;
};

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
  const [showRatings, setShowRatings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [ratingAspects, setRatingAspects] = useState<RatingAspect[]>([
    { name: "Overall", icon: <Star className="h-5 w-5" />, value: 0 },
    { name: "Product Knowledge", icon: <Award className="h-5 w-5" />, value: 0 },
    { name: "Job Performance", icon: <ThumbsUp className="h-5 w-5" />, value: 0 },
    { name: "Customer Service", icon: <CustomerService className="h-5 w-5" />, value: 0 },
    { name: "Teamwork", icon: <Users className="h-5 w-5" />, value: 0 },
  ]);

  const handleAssigneeChange = async (id: string) => {
    setAssigneeId(id);
    onAssign(id);
    
    try {
      const selectedAssignee = assignees.find(a => a.id === id);
      
      if (selectedAssignee) {
        // First, store in localStorage for offline capability
        const assignments = JSON.parse(localStorage.getItem('assignments') || '[]');
        
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
        localStorage.setItem('staffMembers', JSON.stringify(assignees));
        
        // Then, store in Supabase
        const { error } = await supabase.from('assignments').upsert({
          id: newAssignment.id,
          area: area,
          assignee_name: selectedAssignee.name,
          assignee_id: selectedAssignee.id,
          status: status,
          assigned_date: new Date().toISOString()
        });
        
        if (error) {
          console.error('Error saving assignment to Supabase:', error);
          toast({
            title: "Error",
            description: "There was an issue saving this assignment. Your changes are saved locally.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error in handleAssigneeChange:', error);
      toast({
        title: "Error",
        description: "There was an issue assigning this task. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Create local preview
        const url = URL.createObjectURL(file);
        setPhotoUrl(url);
        
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${area.replace(/\s+/g, '-').toLowerCase()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('task-photos')
          .upload(fileName, file);
          
        if (error) {
          console.error('Error uploading photo:', error);
          toast({
            title: "Upload Error",
            description: "Failed to upload photo to cloud storage. Using local preview only.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error in handlePhotoUpload:', error);
      }
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

  const cycleStatus = async () => {
    const statuses: ('needs-check' | 'in-progress' | 'done')[] = ['needs-check', 'in-progress', 'done'];
    const currentIndex = statuses.indexOf(status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    const newStatus = statuses[nextIndex];
    setStatus(newStatus);
    
    // If the status changes to done, prompt for ratings
    if (newStatus === 'done' && assigneeId) {
      setShowRatings(true);
    }
    
    try {
      // Update the assignment status in localStorage
      if (assigneeId) {
        const assignments = JSON.parse(localStorage.getItem('assignments') || '[]');
        const assignmentIndex = assignments.findIndex(
          (a: any) => a.area === area && a.assigneeId === assigneeId && a.status !== 'done'
        );
        
        if (assignmentIndex !== -1) {
          assignments[assignmentIndex].status = newStatus;
          localStorage.setItem('assignments', JSON.stringify(assignments));
          
          // Also update in Supabase
          const assignmentId = assignments[assignmentIndex].id;
          const { error } = await supabase
            .from('assignments')
            .update({ status: newStatus })
            .eq('id', assignmentId);
            
          if (error) {
            console.error('Error updating assignment status in Supabase:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error in cycleStatus:', error);
    }
  };
  
  const handleRatingChange = (index: number, value: number) => {
    const updatedRatings = [...ratingAspects];
    updatedRatings[index] = { ...updatedRatings[index], value };
    setRatingAspects(updatedRatings);
  };
  
  const submitRatings = async () => {
    if (!assigneeId) return;
    
    try {
      setIsSubmitting(true);
      const selectedAssignee = assignees.find(a => a.id === assigneeId);
      
      if (selectedAssignee) {
        // Save to localStorage
        const ratings = JSON.parse(localStorage.getItem('ratings') || '[]');
        
        const newRating = {
          id: `${area}-${assigneeId}-${Date.now()}`,
          staffId: assigneeId,
          staffName: selectedAssignee.name,
          area: area,
          date: new Date().toISOString().split('T')[0],
          comment: comment,
          aspects: ratingAspects.map(aspect => ({
            name: aspect.name,
            rating: aspect.value
          }))
        };
        
        ratings.push(newRating);
        localStorage.setItem('ratings', JSON.stringify(ratings));
        
        // Save to Supabase
        const { error } = await supabase.from('ratings').insert({
          id: newRating.id,
          staff_id: assigneeId,
          staff_name: selectedAssignee.name,
          area: area,
          comment: comment,
          rating_date: new Date().toISOString(),
          overall: ratingAspects[0].value,
          product_knowledge: ratingAspects[1].value,
          job_performance: ratingAspects[2].value,
          customer_service: ratingAspects[3].value,
          teamwork: ratingAspects[4].value
        });
        
        if (error) {
          console.error('Error saving ratings to Supabase:', error);
          toast({
            title: "Error",
            description: "There was an issue saving ratings to the database. Your ratings are saved locally.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Ratings Submitted",
            description: "Employee ratings have been successfully recorded."
          });
          
          // Reset ratings after submission
          setRatingAspects(ratingAspects.map(aspect => ({ ...aspect, value: 0 })));
          setShowRatings(false);
        }
      }
    } catch (error) {
      console.error('Error in submitRatings:', error);
      toast({
        title: "Error",
        description: "Failed to submit ratings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
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

        {showRatings && status === 'done' && (
          <div className="mb-4 bg-gray-50 p-3 rounded-md">
            <p className="mb-2 font-medium">Rate employee performance:</p>
            
            {ratingAspects.map((aspect, index) => (
              <div key={aspect.name} className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    {aspect.icon}
                    <span className="text-sm font-medium">{aspect.name}</span>
                  </div>
                  <div className="text-sm text-gray-500">{aspect.value > 0 ? `${aspect.value}/5` : "Not rated"}</div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Button
                      key={value}
                      variant="ghost"
                      className="p-1 h-8"
                      onClick={() => handleRatingChange(index, value)}
                    >
                      <Star 
                        className={`h-5 w-5 ${aspect.value >= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                      />
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            
            <Button 
              onClick={submitRatings} 
              className="w-full mt-2"
              disabled={isSubmitting || ratingAspects[0].value === 0}
            >
              Submit Ratings
            </Button>
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
