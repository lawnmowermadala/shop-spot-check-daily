import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, X, Upload, Lightbulb, Search } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  const [localAssignees, setLocalAssignees] = useState<Array<{ id: string; name: string; value: string; label: string; searchTerms: string }>>([]);
  const [showSelfInitiative, setShowSelfInitiative] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const filteredAssignees = localAssignees.filter(assignee =>
    assignee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedAssignee = localAssignees.find(assignee => assignee.id === selectedAssigneeId);

  // Focus management for mobile
  useEffect(() => {
    if (isDropdownOpen && inputRef.current) {
      inputRef.current.focus();
      // Scroll dropdown into view on mobile
      setTimeout(() => {
        dropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
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
          // Convert to searchable format
          const staffForSearch = data.map(staff => ({
            id: staff.id.toString(),
            name: staff.name,
            value: staff.id.toString(),
            label: staff.name,
            searchTerms: staff.name.toLowerCase()
          }));
          
          setLocalAssignees(staffForSearch);
        } else if (assignees && assignees.length > 0) {
          // Convert assignees to searchable format
          const assigneesForSearch = assignees.map(assignee => ({
            id: assignee.id.toString(),
            name: assignee.name,
            value: assignee.id.toString(),
            label: assignee.name,
            searchTerms: assignee.name.toLowerCase()
          }));
          
          setLocalAssignees(assigneesForSearch);
          console.log('Using prop assignees instead:', assigneesForSearch);
        } else {
          setLocalAssignees([]);
          console.log('No staff members available');
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

      // Create the assignment with self-initiative flag if applicable
      const finalInstructions = showSelfInitiative 
        ? `${instructions} [SELF INITIATIVE MERIT AWARD]`
        : instructions;

      // Assign the area (photoUrl may be null/undefined)
      onAssign(selectedAssigneeId, finalInstructions, photoUrl || undefined);

      // Clear form
      setSelectedAssigneeId("");
      setInstructions("");
      setPhotoFile(null);
      setPhotoPreview(null);
      setShowAssignForm(false);
      setShowSelfInitiative(false);
      
      // Show different toast message for Self Initiative
      const selectedAssignee = localAssignees.find(a => a.id === selectedAssigneeId);
      const toastMessage = showSelfInitiative 
        ? `Self-initiative merit awarded to ${selectedAssignee?.name}!` 
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
              <div className="relative w-full" ref={dropdownRef}>
                <button
                  type="button"
                  className="w-full p-2 border rounded flex justify-between items-center bg-white text-left"
                  onClick={() => {
                    setIsDropdownOpen(!isDropdownOpen);
                    setSearchTerm("");
                  }}
                >
                  <span className="truncate">
                    {selectedAssignee?.name || "Type to search staff..."}
                  </span>
                  <svg
                    className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                      isDropdownOpen ? "transform rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 md:absolute md:inset-auto md:mt-1 md:block md:bg-transparent">
                    <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-lg md:relative md:max-h-60 md:overflow-auto">
                      <div className="sticky top-0 z-10 bg-white p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            ref={inputRef}
                            type="text"
                            placeholder="Search staff..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setIsDropdownOpen(false);
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-[60vh] md:max-h-52">
                        {filteredAssignees.length === 0 ? (
                          <div className="px-4 py-2 text-gray-500">No staff found</div>
                        ) : (
                          filteredAssignees.map((assignee) => (
                            <button
                              key={assignee.id}
                              type="button"
                              className={`w-full text-left px-4 py-3 hover:bg-gray-100 ${
                                selectedAssigneeId === assignee.id ? "bg-gray-100 font-medium" : ""
                              }`}
                              onClick={() => {
                                setSelectedAssigneeId(assignee.id);
                                setIsDropdownOpen(false);
                                setSearchTerm("");
                                console.log('Selected staff member:', assignee.id);
                              }}
                            >
                              {assignee.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Self Initiative Toggle */}
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <input
                type="checkbox"
                id="self-initiative"
                checked={showSelfInitiative}
                onChange={(e) => setShowSelfInitiative(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="self-initiative" className="flex items-center gap-2 text-sm cursor-pointer">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-amber-700 font-medium">
                  Award Self Initiative Merit (staff took initiative on this task)
                </span>
              </label>
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
              {showSelfInitiative ? 'Award Self Initiative Merit' : 'Assign Area'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChecklistItem;
