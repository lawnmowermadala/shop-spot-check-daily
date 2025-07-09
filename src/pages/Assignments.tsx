import { useState, useEffect, useRef } from 'react';
import { useLocation } from "react-router-dom";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock, CirclePlay, X, AlertTriangle, Calendar, Printer, FileText, ImageIcon, Lightbulb, AlertCircle, Search, Award, Star } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Assignment {
  id?: string;
  area: string;
  assignee_id: number;
  assignee_name: string;
  status: string;
  instructions?: string;
  photo_url?: string | null;
  created_at?: string;
}

const statusIcons = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  in_progress: <CirclePlay className="h-4 w-4 text-blue-500" />,
  done: <Check className="h-4 w-4 text-green-500" />,
  completed: <Check className="h-4 w-4 text-green-500" />
};

const Assignments = () => {
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [staffMembers, setStaffMembers] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Mutation for awarding self initiative
  const awardSelfInitiative = useMutation({
    mutationFn: async (staffName: string) => {
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          area: 'Self Initiative Merit',
          assignee_id: -1,
          assignee_name: staffName,
          status: 'completed',
          instructions: `[SELF INITIATIVE MERIT AWARD] ${staffName} demonstrated exceptional initiative on ${format(new Date(), 'PP')}`,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Award Granted",
        description: "Self-initiative award has been recorded!",
        variant: "default"
      });
      // Refresh assignments
      fetchAssignments();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to grant award. Please try again.",
        variant: "destructive"
      });
    }
  });

  const fetchAssignments = async () => {
    try {
      const [assignmentsRes, staffRes] = await Promise.all([
        supabase.from('assignments').select('*').order('created_at', { ascending: false }),
        supabase.from('staff').select('id, name')
      ]);

      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
      if (staffRes.data) {
        setStaffMembers(staffRes.data.map(staff => ({
          value: staff.id.toString(),
          label: staff.name
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch assignments and staff
  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleAwardInitiative = (staffName: string) => {
    if (confirm(`Grant ${staffName} a Self-Initiative Award?`)) {
      awardSelfInitiative.mutate(staffName);
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (statusFilter && assignment.status !== statusFilter) return false;
    if (assigneeFilter && assignment.assignee_id.toString() !== assigneeFilter) return false;
    if (dateRange?.from && dateRange?.to) {
      const assignmentDate = new Date(assignment.created_at || '');
      if (!isWithinInterval(assignmentDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return false;
    }
    return true;
  });

  const updateAssignmentStatus = async (id: string, status: string) => {
    try {
      await supabase.from('assignments').update({ status }).eq('id', id);
      setAssignments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      toast({ title: "Status updated", description: "Assignment status has been updated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update assignment status.", variant: "destructive" });
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      await supabase.from('assignments').delete().eq('id', id);
      setAssignments(prev => prev.filter(a => a.id !== id));
      toast({ title: "Assignment deleted", description: "Assignment has been deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete assignment.", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

const StaffDropdown = ({
  options,
  value,
  onChange,
  placeholder = "Filter by assignee",
  className = ""
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(option => option.value === value);

  // Focus management for mobile
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      // Scroll dropdown into view on mobile
      setTimeout(() => {
        dropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="w-full p-2 border rounded flex justify-between items-center bg-white"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm("");
        }}
      >
        <span className="truncate">
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? "transform rotate-180" : ""
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

      {isOpen && (
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
                      setIsOpen(false);
                    }
                  }}
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[60vh] md:max-h-52">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-2 text-gray-500">No staff found</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-full text-left px-4 py-3 hover:bg-gray-100 ${
                      value === option.value ? "bg-gray-100 font-medium" : ""
                    }`}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
            <div className="sticky bottom-0 bg-white p-2 border-t">
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-blue-600 hover:bg-gray-100"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                  setSearchTerm("");
                }}
              >
                Clear filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Job Assignments</h1>
      
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={statusFilter === "" ? "default" : "outline"}
            onClick={() => setStatusFilter("")}
          >
            All
          </Button>
          <Button 
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
          >
            Pending
          </Button>
          <Button 
            variant={statusFilter === "in_progress" ? "default" : "outline"}
            onClick={() => setStatusFilter("in_progress")}
          >
            In Progress
          </Button>
          <Button 
            variant={statusFilter === "done" ? "default" : "outline"}
            onClick={() => setStatusFilter("done")}
          >
            Done
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-full md:w-auto">
            <DateRangePicker 
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              className="max-w-sm"
            />
          </div>
          
          <div className="w-full md:w-auto">
            <StaffDropdown
              options={staffMembers}
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              className="min-w-[200px]"
            />
          </div>
          
          <Button 
            variant="outline" 
            onClick={handlePrint}
            className="ml-auto"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print List
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Assignments
            {filteredAssignments.length > 0 && (
              <span className="text-sm text-gray-500">({filteredAssignments.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading assignments...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No assignments found for the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Instructions</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => {
                  const isReward = assignment.instructions?.includes('[SELF INITIATIVE MERIT AWARD]');
                  return (
                    <TableRow key={assignment.id} className={isReward ? 'bg-amber-50' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {assignment.area}
                          {isReward && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                              <Award className="h-3 w-3 mr-1" />
                              Merit Award
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {assignment.assignee_name}
                          {isReward && (
                            <Star className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusIcons[assignment.status as keyof typeof statusIcons]}
                          <span className="capitalize">{assignment.status.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {assignment.instructions ? (
                          <div className="text-sm">
                            {isReward ? (
                              <div className="flex items-center gap-1 text-amber-700">
                                <Lightbulb className="h-3 w-3" />
                                {assignment.instructions.replace('[SELF INITIATIVE MERIT AWARD] ', '')}
                              </div>
                            ) : (
                              assignment.instructions
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No instructions</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment.photo_url ? (
                          <div className="w-16 h-16">
                            <AspectRatio ratio={1}>
                              <img
                                src={assignment.photo_url}
                                alt="Assignment photo"
                                className="rounded-md object-cover w-full h-full cursor-pointer"
                                onClick={() => window.open(assignment.photo_url!, '_blank')}
                              />
                            </AspectRatio>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-md">
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(assignment.created_at || ''), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {assignment.status !== 'done' && !isReward && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAssignmentStatus(assignment.id!, 'done')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {!isReward && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAwardInitiative(assignment.assignee_name)}
                              title="Award Self Initiative Merit"
                            >
                              <Award className="h-4 w-4 text-amber-500" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteAssignment(assignment.id!)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default Assignments;
