import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, X, Upload } from 'lucide-react';
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

interface StaffMember {
  id: string;
  name: string;
}

interface ChecklistItemProps {
  area: string;
  description: string;
  assignees?: StaffMember[];
  onAssign: (assigneeId: string, instructions: string, photoUrl?: string) => void;
  isAssigned: boolean;
}

const ChecklistItem = ({ 
  area, 
  description, 
  assignees = [], 
  onAssign, 
  isAssigned 
}: ChecklistItemProps) => {
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch staff members from Supabase
  useEffect(() => {
    const fetchStaff = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('staff') // Ensure this matches your table name
          .select('id, name')
          .eq('status', 1) // Only active staff
          .order('name', { ascending: true });

        if (error) throw error;

        setStaffMembers(data || []);
        
        // Fallback to prop assignees if no staff found
        if (!data?.length && assignees.length) {
          setStaffMembers(assignees);
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast({
          title: "Error",
          description: "Failed to load staff members",
          variant: "destructive"
        });
        setStaffMembers(assignees);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, [assignees]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAssign = async () => {
    if (!selectedAssigneeId) {
      toast({
        title: "Required",
        description: "Please select a staff member",
        variant: "destructive"
      });
      return;
    }

    try {
      let photoUrl: string | undefined;

      // Upload photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${area}-${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('task-photos')
          .upload(fileName, photoFile);

        if (error) throw error;
        photoUrl = data.path;
      }

      // Call parent handler
      onAssign(selectedAssigneeId, instructions, photoUrl);

      // Reset form
      setSelectedAssigneeId("");
      setInstructions("");
      setPhotoFile(null);
      setPhotoPreview(null);
      setShowAssignForm(false);
    } catch (error) {
      console.error('Assignment error:', error);
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className={isAssigned ? "border-green-500 bg-green-50" : ""}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg">{area}</h3>
            <p className="text-gray-600 text-sm">{description}</p>
          </div>
          
          {isAssigned ? (
            <Button variant="outline" className="bg-green-50" disabled>
              <User className="h-4 w-4 mr-2 text-green-500" />
              Assigned
            </Button>
          ) : showAssignForm ? (
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
              Assign
            </Button>
          )}
        </div>
        
        {showAssignForm && !isAssigned && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              <Select
                value={selectedAssigneeId}
                onValueChange={setSelectedAssigneeId}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoading ? "Loading staff..." : "Select staff"} />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.length > 0 ? (
                    staffMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {isLoading ? "Loading..." : "No staff available"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <Textarea
              placeholder="Add instructions..."
              className="min-h-[80px]"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            
            <div className="space-y-2">
              {photoPreview ? (
                <div className="relative group">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full rounded-md max-h-48 object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center py-3 px-4 border border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                  <Upload className="h-5 w-5 mb-1 text-gray-500" />
                  <span className="text-sm">Upload Photo (Optional)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleAssign}
              disabled={!selectedAssigneeId}
            >
              Confirm Assignment
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChecklistItem;
