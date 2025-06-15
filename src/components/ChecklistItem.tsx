import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, X, Upload, Lightbulb } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AssigneeSelect from './AssigneeSelect';

interface Assignee {
  id: number;
  name: string;
  department_id?: number;
  department_name?: string;
}

interface ChecklistItemProps {
  area: string;
  description: string;
  onAssign: (assigneeId: string, instructions: string, photoUrl?: string) => void;
  assignees: Assignee[];
  isAssigned?: boolean;
  assignedTo?: string;
  assignmentCount?: number;
  isRecentlyAssigned?: boolean;
}

const ChecklistItem = ({ 
  area, 
  description, 
  onAssign, 
  assignees, 
  isAssigned, 
  assignedTo,
  assignmentCount = 0,
  isRecentlyAssigned 
}: ChecklistItemProps) => {
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [localAssignees, setLocalAssignees] = useState<Array<{ id: string; name: string }>>([]);
  
  // Fetch staff members directly from Supabase
  useEffect(() => {
    console.log('PropAssignees passed to ChecklistItem:', assignees);
    
    const fetchStaffMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('staff')
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
        
        console.log('Fetched staff members in ChecklistItem:', data);
        
        if (data && data.length > 0) {
          // Convert id to string for compatibility with the component and add Self Initiative
          const staffWithStringIds = data.map(staff => ({
            id: staff.id.toString(),
            name: staff.name
          }));
          
          // Add "Self Initiative" as first option
          const staffWithSelfInitiative = [
            { id: '-1', name: 'Self Initiative' },
            ...staffWithStringIds
          ];
          
          setLocalAssignees(staffWithSelfInitiative);
        } else if (assignees && assignees.length > 0) {
          // Convert assignees with number ids to string ids for the local state
          const assigneesWithStringIds = assignees.map(assignee => ({
            id: assignee.id.toString(),
            name: assignee.name
          }));
          
          // Add "Self Initiative" as first option
          const assigneesWithSelfInitiative = [
            { id: '-1', name: 'Self Initiative' },
            ...assigneesWithStringIds
          ];
          
          setLocalAssignees(assigneesWithSelfInitiative);
          console.log('Using prop assignees instead:', assigneesWithSelfInitiative);
        } else {
          // Even if no staff, add Self Initiative option
          setLocalAssignees([{ id: '-1', name: 'Self Initiative' }]);
          console.log('No staff members available, added Self Initiative only');
        }
      } catch (err) {
        console.error('Exception fetching staff:', err);
      }
    };
    
    fetchStaffMembers();
  }, [assignees]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleAssign = async () => {
    if (!selectedAssigneeId) {
      toast({
        title: "Error",
        description: "Please select a staff member",
        variant: "destructive"
      });
      return;
    }
    
    try {
      let photoUrl: string | null = null;
      
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.${fileExt}`;
        const filePath = `${area}/${fileName}`;

        // --- DEBUG: Add log to confirm bucket ---
        console.log("[CHECKLIST_ITEM] uploading to bucket: 'area_photos', path:", filePath);

        // --- Upload to Supabase Storage (public bucket) ---
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('area_photos')
          .upload(filePath, photoFile, { upsert: false });

        if (uploadError) {
          console.error("[CHECKLIST_ITEM] Photo upload error:", uploadError);
          toast({
            title: "Photo Upload Failed",
            description: uploadError.message + " (are you sure the 'area_photos' bucket exists and is public?)",
            variant: "destructive"
          });
          return; // Stop processing if upload fails!
        } else if (uploadData) {
          // --- Get public URL ---
          const { data: publicUrlData } = supabase
            .storage
            .from('area_photos')
            .getPublicUrl(filePath);

          if (publicUrlData && publicUrlData.publicUrl) {
            photoUrl = publicUrlData.publicUrl;
            console.log("[CHECKLIST_ITEM] Got photo public URL:", photoUrl);
          } else {
            photoUrl = null;
            toast({
              title: "Photo Upload Error",
              description: "File uploaded but missing public URL.",
              variant: "destructive"
            });
            return;
          }
        }
      }

      // Assign the area (photoUrl may be null/undefined)
      onAssign(selectedAssigneeId, instructions, photoUrl || undefined);

      // Clear form
      setSelectedAssigneeId("");
      setInstructions("");
      setPhotoFile(null);
      setPhotoPreview(null);
      setShowAssignForm(false);
      
      // Show different toast message for Self Initiative
      const selectedAssignee = localAssignees.find(a => a.id === selectedAssigneeId);
      const toastMessage = selectedAssignee?.name === 'Self Initiative' 
        ? "Task marked as self-initiative!" 
        : "Assignment created";
      
      toast({
        title: toastMessage,
        description: photoUrl ? "Photo uploaded and attached." : "No photo attached."
      });
    } catch (error: any) {
      console.error('[CHECKLIST_ITEM] Error during assignment:', error);
      toast({
        title: "Error",
        description: "Failed to assign area: " + (error?.message || "Unknown error"),
        variant: "destructive"
      });
    }
  };

  const assignmentBadge = assignmentCount > 0 ? (
    <span className="bg-green-100 text-green-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
      {assignmentCount} {assignmentCount === 1 ? 'assignment' : 'assignments'}
    </span>
  ) : null;
  
  return (
    <Card className={isRecentlyAssigned ? "border-green-500 bg-red-50" : ""}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg text-red-600">{area}</h3>
            <p className="text-gray-600 text-sm">{description}</p>
            {assignmentBadge}
            {assignedTo && (
              <p className="text-sm text-gray-500 mt-1">
                Assigned to: {assignedTo}
              </p>
            )}
          </div>
          
          {showAssignForm ? (
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setShowAssignForm(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => setShowAssignForm(true)}
            >
              <User className="h-4 w-4 mr-2" />
              Assign to...
            </Button>
          )}
        </div>
        
        {/* Show photo preview (if any) after assigning */}
        {photoPreview && !showAssignForm && (
          <div className="my-2">
            <img
              src={photoPreview}
              alt="Assignment preview"
              className="rounded-md object-cover w-full max-h-[160px] border"
              style={{ maxWidth: "250px" }}
            />
          </div>
        )}
        
        {showAssignForm && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              <Select 
                value={selectedAssigneeId} 
                onValueChange={(value) => {
                  console.log('Selected staff member:', value);
                  setSelectedAssigneeId(value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {localAssignees && localAssignees.length > 0 ? (
                    localAssignees.map(assignee => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        <div className="flex items-center gap-2">
                          {assignee.name === 'Self Initiative' && (
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                          )}
                          <span className={assignee.name === 'Self Initiative' ? 'text-amber-600 font-medium' : ''}>
                            {assignee.name}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No staff members available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <Textarea 
              placeholder="Add your comments here..." 
              className="min-h-[80px]"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            
            {photoPreview ? (
              <div className="relative">
                <img 
                  src={photoPreview} 
                  alt="Preview" 
                  className="w-full h-auto rounded-md max-h-[200px] object-cover" 
                />
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex justify-center">
                <label className="cursor-pointer">
                  <div className="flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                </label>
              </div>
            )}
            
            <Button className="w-full" onClick={handleAssign}>
              Assign Area
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChecklistItem;
