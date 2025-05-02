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
  id: number;  // Changed from string to match your StaffPage
  name: string;
  department_id?: number;
  department_name?: string;
}

interface ChecklistItemProps {
  area: string;
  description: string;
  onAssign: (assigneeId: string, instructions: string, photoUrl?: string) => void;
  isAssigned: boolean;
}

const ChecklistItem = ({ 
  area, 
  description, 
  onAssign, 
  isAssigned 
}: ChecklistItemProps) => {
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  // Fetch staff members using the same pattern as StaffPage
  useEffect(() => {
    const fetchStaff = async () => {
      setIsLoadingStaff(true);
      try {
        const { data, error } = await supabase
          .from('staff')
          .select(`
            *,
            departments:department_id (name)
          `)
          .order('name');

        if (error) throw error;

        const formattedStaff = data?.map(item => ({
          id: item.id,
          name: item.name,
          department_id: item.department_id,
          department_name: item.departments?.name || 'No Department'
        })) || [];

        setStaffMembers(formattedStaff);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast({
          title: "Error",
          description: "Failed to load staff members",
          variant: "destructive"
        });
      } finally {
        setIsLoadingStaff(false);
      }
    };

    fetchStaff();
  }, []);

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

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${area}-${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('area_photos')
          .upload(fileName, photoFile);

        if (error) throw error;
        photoUrl = data.path;
      }

      onAssign(selectedAssigneeId, instructions, photoUrl);
      
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
      console.error('Assignment error:', error);
      toast({
        title: "Error",
        description: "Failed to assign area",
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
                  <SelectValue placeholder={isLoadingStaff ? "Loading staff..." : "Select staff member"} />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.length > 0 ? (
                    staffMembers.map(member => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.name} ({member.department_name})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {isLoadingStaff ? "Loading..." : "No staff available"}
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
            
            <Button 
              className="w-full" 
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
