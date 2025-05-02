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

interface ChecklistItemProps {
  area: string;
  description: string;
  assignees: Array<{ id: string; name: string }>;
  onAssign: (assigneeId: string, instructions: string, photoUrl?: string) => void;
  isAssigned: boolean;
}

const ChecklistItem = ({ 
  area, 
  description, 
  assignees: propAssignees, 
  onAssign, 
  isAssigned 
}: ChecklistItemProps) => {
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  // Fetch staff members from Supabase
  useEffect(() => {
    const fetchStaffMembers = async () => {
      setIsLoadingStaff(true);
      try {
        const { data, error } = await supabase
          .from('staff') // or 'staff_members' if that's your table name
          .select('id, name')
          .eq('is_active', true) // or 'status', depending on your schema
          .order('name', { ascending: true });

        if (error) throw error;

        if (data?.length) {
          setStaffMembers(data);
        } else {
          // Fallback to prop assignees if no data from Supabase
          setStaffMembers(propAssignees || []);
          console.warn('No staff found in database, using propAssignees');
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast({
          title: "Error",
          description: "Failed to load staff members",
          variant: "destructive"
        });
        setStaffMembers(propAssignees || []);
      } finally {
        setIsLoadingStaff(false);
      }
    };

    fetchStaffMembers();
  }, [propAssignees]);

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
      let photoUrl: string | undefined;

      // Upload photo if available
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const filePath = `${area}/${Date.now()}.${fileExt}`;
        
        try {
          const { data, error } = await supabase
            .storage
            .from('area_photos')
            .upload(filePath, photoFile);
          
          if (error) throw error;
          photoUrl = data.path;
        } catch (storageError) {
          console.error('Photo upload error:', storageError);
          toast({
            title: "Warning",
            description: "Photo couldn't be uploaded, continuing without it",
            variant: "default"
          });
        }
      }
      
      // Assign the area
      onAssign(selectedAssigneeId, instructions, photoUrl);
      
      // Clear form
      setSelectedAssigneeId("");
      setInstructions("");
      setPhotoFile(null);
      setPhotoPreview(null);
      setShowAssignForm(false);

      toast({
        title: "Success",
        description: "Area assigned successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error during assignment:', error);
      toast({
        title: "Error",
        description: "Failed to assign area. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className={isAssigned ? "border-green-500 bg-green-50" : "border-gray-200"}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{area}</h3>
            <p className="text-gray-600 text-sm">{description}</p>
          </div>
          
          {isAssigned ? (
            <Button variant="outline" className="bg-green-50" disabled>
              <User className="h-4 w-4 mr-2 text-green-600" />
              Assigned
            </Button>
          ) : showAssignForm ? (
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setShowAssignForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => setShowAssignForm(true)}
              className="hover:bg-gray-50"
            >
              <User className="h-4 w-4 mr-2 text-gray-600" />
              Assign to...
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
                disabled={isLoadingStaff}
              >
                <SelectTrigger className="w-full">
                  <SelectValue 
                    placeholder={isLoadingStaff ? "Loading staff..." : "Select staff member"} 
                  />
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
                      {isLoadingStaff ? "Loading..." : "No staff members available"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <Textarea 
              placeholder="Add instructions or comments..." 
              className="min-h-[80px]"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            
            {photoPreview ? (
              <div className="relative group">
                <img 
                  src={photoPreview} 
                  alt="Preview" 
                  className="w-full h-auto rounded-md max-h-[200px] object-cover border border-gray-200" 
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
              <div className="flex justify-center">
                <label className="cursor-pointer">
                  <div className="flex items-center justify-center py-2 px-4 border border-dashed border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors">
                    <Upload className="h-4 w-4 mr-2 text-gray-500" />
                    Upload Photo (Optional)
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
            
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleAssign}
              disabled={!selectedAssigneeId || isLoadingStaff}
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
