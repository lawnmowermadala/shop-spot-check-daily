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
import { Check, Clock, CirclePlay, X, AlertTriangle, Calendar, Printer, FileText, ImageIcon, Lightbulb, AlertCircle, Search } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type Assignment = {
  id: string;
  area: string;
  assignee_name: string;
  assignee_id: number;
  status: 'pending' | 'needs-check' | 'in-progress' | 'done' | 'incomplete';
  created_at: string;
  instructions?: string;
  photo_url?: string;
}

const statusIcons = {
  'pending': <AlertTriangle className="h-5 w-5 text-orange-500" />,
  'needs-check': <CirclePlay className="h-5 w-5 text-yellow-500" />,
  'in-progress': <Clock className="h-5 w-5 text-blue-500" />,
  'done': <Check className="h-5 w-5 text-green-500" />,
  'incomplete': <X className="h-5 w-5 text-red-500" />
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

  // Keep focus on input when dropdown is open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
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
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-2 py-1 sticky top-0 bg-white border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search staff..."
                className="pl-8"
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
          <div className="overflow-y-auto max-h-[200px]">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-gray-500">No staff found</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
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
          <div className="px-2 py-1 border-t">
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
      )}
    </div>
  );
};

const Assignments = () => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'needs-check' | 'in-progress' | 'done' | 'incomplete'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [completionMode, setCompletionMode] = useState<{ [key: string]: boolean }>({});
  const [selfInitiativeReward, setSelfInitiativeReward] = useState<{ [key: string]: boolean }>({});
  const [completionDemerit, setCompletionDemerit] = useState<{ [key: string]: boolean }>({});
  const [incompleteMode, setIncompleteMode] = useState<{ [key: string]: boolean }>({});
  const [demeritAssignment, setDemeritAssignment] = useState<{ [key: string]: boolean }>({});
  const printRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const assignmentRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Assignment[];
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      throw error;
    }
  };

  const { data: assignments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['assignments'],
    queryFn: fetchAssignments,
    retry: 1
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const scrollId = params.get('id');
    if (scrollId) {
      setFilter('all');
      setDateRange(undefined);
      setHighlightedId(scrollId);
      setExpandedAssignment(scrollId);
    }
  }, [location.search]);

  useEffect(() => {
    if (highlightedId && assignments.length > 0) {
      const targetRef = assignmentRefs.current[highlightedId];
      if (targetRef) {
        setTimeout(() => {
          targetRef.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          setTimeout(() => setHighlightedId(null), 2500);
        }, 100);
      }
    }
  }, [highlightedId, assignments]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error Loading Assignments",
        description: error.message || "Please check your connection and try again.",
        variant: "destructive",
        action: (
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        )
      });
    }
  }, [error, refetch]);

  const updateAssignmentStatus = async (id: string, status: Assignment['status']) => {
    try {
      const assignment = assignments.find(a => a.id === id);
      if (!assignment) return;

      let updatedInstructions = assignment.instructions || '';
      
      if (status === 'done' && selfInitiativeReward[id]) {
        if (!updatedInstructions.includes('[SELF INITIATIVE MERIT AWARD]')) {
          updatedInstructions = updatedInstructions 
            ? `${updatedInstructions}\n\n[SELF INITIATIVE MERIT AWARD] - Recognized for exceptional initiative during task completion.`
            : '[SELF INITIATIVE MERIT AWARD] - Recognized for exceptional initiative during task completion.';
        }
      }

      if (status === 'done' && completionDemerit[id]) {
        if (!updatedInstructions.includes('[DEMERIT ASSIGNED - POOR STANDARD]')) {
          updatedInstructions = updatedInstructions 
            ? `${updatedInstructions}\n\n[DEMERIT ASSIGNED - POOR STANDARD] - Task completed but not to required standard.`
            : '[DEMERIT ASSIGNED - POOR STANDARD] - Task completed but not to required standard.';
        }
      }

      if (status === 'incomplete' && demeritAssignment[id]) {
        if (!updatedInstructions.includes('[DEMERIT ASSIGNED]')) {
          updatedInstructions = updatedInstructions 
            ? `${updatedInstructions}\n\n[DEMERIT ASSIGNED] - Task not completed according to instructions.`
            : '[DEMERIT ASSIGNED] - Task not completed according to instructions.';
        }
      }

      const { error } = await supabase
        .from('assignments')
        .update({ 
          status,
          instructions: updatedInstructions
        })
        .eq('id', id);
      
      if (error) throw error;
      
      await refetch();
      
      setCompletionMode(prev => ({ ...prev, [id]: false }));
      setSelfInitiativeReward(prev => ({ ...prev, [id]: false }));
      setCompletionDemerit(prev => ({ ...prev, [id]: false }));
      setIncompleteMode(prev => ({ ...prev, [id]: false }));
      setDemeritAssignment(prev => ({ ...prev, [id]: false }));
      
      let toastTitle = "Status Updated";
      let toastDescription = `Assignment marked as ${status.replace('-', ' ')}`;
      
      if (status === 'done' && selfInitiativeReward[id]) {
        toastTitle = "Task Completed with Merit Award!";
        toastDescription = `${assignment.assignee_name} has been awarded a Self Initiative Merit for exceptional performance!`;
      } else if (status === 'done' && completionDemerit[id]) {
        toastTitle = "Task Completed with Demerit";
        toastDescription = `${assignment.assignee_name} has been assigned a demerit for poor standard work.`;
      } else if (status === 'incomplete' && demeritAssignment[id]) {
        toastTitle = "Task Marked Incomplete with Demerit";
        toastDescription = `${assignment.assignee_name} has been assigned a demerit for not following instructions.`;
      }
      
      toast({
        title: toastTitle,
        description: toastDescription,
      });
    } catch (err) {
      console.error('Error updating status:', err);
      toast({
        title: "Update Failed",
        description: "Couldn't update status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const clearAssignment = async (id: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('assignments')
        .select('status')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (data.status !== 'pending') {
        toast({
          title: "Cannot Clear Assignment",
          description: "Only pending assignments can be cleared. Assignments that have been started, completed or marked as incomplete cannot be deleted.",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await refetch();
      
      toast({
        title: "Assignment Cleared",
        description: "The pending assignment has been removed",
      });
    } catch (err) {
      console.error('Error clearing assignment:', err);
      toast({
        title: "Clear Failed",
        description: "Couldn't clear assignment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const isWithinDateRange = (assignment: Assignment): boolean => {
    if (!dateRange || !dateRange.from) return true;
    
    const assignmentDate = new Date(assignment.created_at);
    const start = dateRange.from ? startOfDay(dateRange.from) : null;
    const end = dateRange.to ? endOfDay(dateRange.to) : (start ? endOfDay(start) : null);
    
    if (!start) return true;
    
    if (end) {
      return isWithinInterval(assignmentDate, { start, end });
    }
    
    const startDay = startOfDay(start);
    const endDay = endOfDay(start);
    return isWithinInterval(assignmentDate, { start: startDay, end: endDay });
  };
  
  // Get unique staff members for filter dropdown
  const staffMembers = Array.from(new Set(
    assignments.map(a => a.assignee_name)
  ))
  .sort()
  .map(name => ({
    value: name,
    label: name
  }));

  // Apply all filters (status, date, and assignee)
  const filteredAssignments = assignments
    .filter(assignment => filter === 'all' || assignment.status === filter)
    .filter(isWithinDateRange)
    .filter(assignment => 
      !assigneeFilter || 
      assignment.assignee_name.toLowerCase().includes(assigneeFilter.toLowerCase())
    );

  const toggleExpandAssignment = (id: string) => {
    setExpandedAssignment(expandedAssignment === id ? null : id);
  };

  const handlePrint = () => {
    const content = printRef.current;
    
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast({
        title: "Print Error",
        description: "Unable to open print window. Please check your browser settings.",
        variant: "destructive"
      });
      return;
    }
    
    let dateRangeText = 'All Dates';
    if (dateRange?.from) {
      dateRangeText = dateRange.to 
        ? `${format(dateRange.from, 'MMM dd, yyyy')} to ${format(dateRange.to, 'MMM dd, yyyy')}` 
        : format(dateRange.from, 'MMM dd, yyyy');
    }
    
    const statusText = filter === 'all' ? 'All Statuses' : `Status: ${filter.replace('-', ' ')}`;
    const assigneeText = assigneeFilter ? `Assignee: ${assigneeFilter}` : 'All Assignees';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Assignments Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            h3 { color: #666; margin-bottom: 20px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .print-header { display: flex; justify-content: space-between; align-items: center; }
            .print-info { margin: 8px 0; }
            .instructions { padding: 8px; background-color: #f9f9f9; border-top: 1px dotted #ddd; }
            .photo-container { max-width: 300px; margin-top: 8px; }
            .photo-container img { width: 100%; height: auto; border: 1px solid #ddd; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>Assignments Report</h1>
            <div>
              <button class="no-print" onclick="window.print()">Print</button>
              <button class="no-print" onclick="window.close()">Close</button>
            </div>
          </div>
          <div class="print-info">Date Range: ${dateRangeText}</div>
          <div class="print-info">Filter: ${statusText}</div>
          <div class="print-info">${assigneeText}</div>
          <div class="print-info">Total: ${filteredAssignments.length} assignments</div>
          <table>
            <thead>
              <tr>
                <th>Area</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Assigned Date</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAssignments.map(assignment => `
                <tr>
                  <td>${assignment.area}</td>
                  <td>${assignment.assignee_name}</td>
                  <td>${assignment.status.replace('-', ' ')}</td>
                  <td>${new Date(assignment.created_at).toLocaleDateString()}</td>
                  <td>
                    ${assignment.instructions ? 
                      `<div class="instructions">
                        <strong>Instructions:</strong><br>
                        ${assignment.instructions}
                      </div>` : 
                      'No instructions provided'}

                    ${assignment.photo_url ? 
                      `<div class="photo-container">
                        <img src="${assignment.photo_url}" alt="Assignment photo" />
                      </div>` : 
                      ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
    }, 500);
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Job Assignments</h1>
      
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            onClick={() => setFilter('all')}
            size="sm"
          >
            All
          </Button>
          <Button 
            variant={filter === 'pending' ? 'default' : 'outline'} 
            onClick={() => setFilter('pending')}
            size="sm"
          >
            Pending
          </Button>
          <Button 
            variant={filter === 'needs-check' ? 'default' : 'outline'} 
            onClick={() => setFilter('needs-check')}
            size="sm"
          >
            Needs Check
          </Button>
          <Button 
            variant={filter === 'in-progress' ? 'default' : 'outline'} 
            onClick={() => setFilter('in-progress')}
            size="sm"
          >
            In Progress
          </Button>
          <Button 
            variant={filter === 'done' ? 'default' : 'outline'} 
            onClick={() => setFilter('done')}
            size="sm"
          >
            Completed
          </Button>
          <Button 
            variant={filter === 'incomplete' ? 'default' : 'outline'} 
            onClick={() => setFilter('incomplete')}
            size="sm"
          >
            Incomplete
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
          <CardTitle>Current Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={printRef} className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Instructions</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      Loading assignments...
                    </TableCell>
                  </TableRow>
                ) : filteredAssignments.length > 0 ? (
                  filteredAssignments.map((assignment) => (
                    <>
                      <TableRow 
                        key={assignment.id}
                        ref={el => { if(el) assignmentRefs.current[assignment.id] = el; }}
                        className={highlightedId === assignment.id ? 'bg-blue-100 transition-colors duration-1000' : ''}
                      >
                        <TableCell className="font-medium">{assignment.area}</TableCell>
                        <TableCell>{assignment.assignee_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {statusIcons[assignment.status]}
                            <span className="capitalize">
                              {assignment.status.replace('-', ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(assignment.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {assignment.instructions ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => toggleExpandAssignment(
                                expandedAssignment === assignment.id ? null : assignment.id)}
                              className="flex items-center gap-1 text-sm"
                            >
                              <FileText className="h-4 w-4" />
                              {expandedAssignment === assignment.id ? "Hide" : "View"} Instructions
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">No instructions</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {assignment.photo_url ? (
                            <div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(assignment.photo_url, '_blank')}
                                className="flex items-center gap-1 text-sm"
                              >
                                <ImageIcon className="h-4 w-4" />
                                View Photo
                              </Button>
                              <div className="mt-2">
                                <img
                                  src={assignment.photo_url}
                                  alt="Assignment photo"
                                  className="rounded-md object-cover w-24 h-16 border"
                                  style={{ maxWidth: "120px", maxHeight: "64px" }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No photo</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            {assignment.status !== 'in-progress' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateAssignmentStatus(assignment.id, 'in-progress')}
                              >
                                Start
                              </Button>
                            )}
                            {assignment.status !== 'done' && (
                              <>
                                {completionMode[assignment.id] ? (
                                  <div className="flex flex-col gap-2 p-2 border rounded bg-green-50">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={`self-initiative-${assignment.id}`}
                                        checked={selfInitiativeReward[assignment.id] || false}
                                        onCheckedChange={(checked) => {
                                          setSelfInitiativeReward(prev => ({ ...prev, [assignment.id]: checked as boolean }));
                                          if (checked) setCompletionDemerit(prev => ({ ...prev, [assignment.id]: false }));
                                        }}
                                      />
                                      <label 
                                        htmlFor={`self-initiative-${assignment.id}`}
                                        className="text-sm flex items-center gap-1 text-amber-700"
                                      >
                                        <Lightbulb className="h-4 w-4" />
                                        Reward Self Initiative
                                      </label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={`completion-demerit-${assignment.id}`}
                                        checked={completionDemerit[assignment.id] || false}
                                        onCheckedChange={(checked) => {
                                          setCompletionDemerit(prev => ({ ...prev, [assignment.id]: checked as boolean }));
                                          if (checked) setSelfInitiativeReward(prev => ({ ...prev, [assignment.id]: false }));
                                        }}
                                      />
                                      <label 
                                        htmlFor={`completion-demerit-${assignment.id}`}
                                        className="text-sm flex items-center gap-1 text-red-700"
                                      >
                                        <AlertCircle className="h-4 w-4" />
                                        Assign Demerit (Poor Standard)
                                      </label>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button 
                                        variant="default" 
                                        size="sm"
                                        onClick={() => updateAssignmentStatus(assignment.id, 'done')}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        Confirm Complete
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                          setCompletionMode(prev => ({ ...prev, [assignment.id]: false }));
                                          setSelfInitiativeReward(prev => ({ ...prev, [assignment.id]: false }));
                                          setCompletionDemerit(prev => ({ ...prev, [assignment.id]: false }));
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setCompletionMode(prev => ({ ...prev, [assignment.id]: true }))}
                                    className="bg-green-50 hover:bg-green-100 text-green-600"
                                  >
                                    Complete
                                  </Button>
                                )}
                              </>
                            )}
                            {assignment.status !== 'incomplete' && (
                              <>
                                {incompleteMode[assignment.id] ? (
                                  <div className="flex flex-col gap-2 p-2 border rounded bg-red-50">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={`demerit-${assignment.id}`}
                                        checked={demeritAssignment[assignment.id] || false}
                                        onCheckedChange={(checked) => 
                                          setDemeritAssignment(prev => ({ ...prev, [assignment.id]: checked as boolean }))
                                        }
                                      />
                                      <label 
                                        htmlFor={`demerit-${assignment.id}`}
                                        className="text-sm flex items-center gap-1 text-red-700"
                                      >
                                        <AlertCircle className="h-4 w-4" />
                                        Assign Demerit
                                      </label>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button 
                                        variant="default" 
                                        size="sm"
                                        onClick={() => updateAssignmentStatus(assignment.id, 'incomplete')}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Confirm Incomplete
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                          setIncompleteMode(prev => ({ ...prev, [assignment.id]: false }));
                                          setDemeritAssignment(prev => ({ ...prev, [assignment.id]: false }));
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setIncompleteMode(prev => ({ ...prev, [assignment.id]: true }))}
                                    className="bg-red-50 hover:bg-red-100 text-red-600"
                                  >
                                    Incomplete
                                  </Button>
                                )}
                              </>
                            )}
                            {assignment.status === 'pending' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => clearAssignment(assignment.id)}
                                className="bg-gray-50 hover:bg-gray-100 text-gray-600"
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedAssignment === assignment.id && assignment.instructions && (
                        <TableRow className="bg-gray-50">
                          <TableCell colSpan={7} className="py-2">
                            <div className="p-3 text-sm border-l-2 border-gray-300">
                              {assignment.instructions}
                            </div>
                            {assignment.photo_url && (
                              <div className="mt-3 max-w-md">
                                <img
                                  src={assignment.photo_url}
                                  alt="Assignment photo"
                                  className="rounded-md object-cover w-full h-full border"
                                  style={{ maxWidth: "300px", maxHeight: "200px" }}
                                />
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      {assignments.length === 0 ? "No assignments found" : "No assignments match this filter"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Navigation />
    </div>
  );
};

export default Assignments;
