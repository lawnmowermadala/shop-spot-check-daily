
import { useState, useEffect, useRef } from 'react';
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
import { Check, Clock, CirclePlay, X, AlertTriangle, Calendar, Printer, FileText, ImageIcon } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { AspectRatio } from "@/components/ui/aspect-ratio";

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

const Assignments = () => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'needs-check' | 'in-progress' | 'done' | 'incomplete'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

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

  useEffect(() => {
    // Fetch photo URLs for assignments that have them
    const fetchPhotos = async () => {
      const urls: Record<string, string> = {};
      
      for (const assignment of assignments) {
        if (assignment.photo_url) {
          try {
            const { data, error } = await supabase
              .storage
              .from('area_photos')
              .createSignedUrl(assignment.photo_url, 3600); // URL valid for 1 hour
            
            if (data && !error) {
              urls[assignment.id] = data.signedUrl;
            }
          } catch (err) {
            console.error('Error fetching photo URL:', err);
          }
        }
      }
      
      setPhotoUrls(urls);
    };
    
    if (assignments.length > 0) {
      fetchPhotos();
    }
  }, [assignments]);

  const updateAssignmentStatus = async (id: string, status: Assignment['status']) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      await refetch();
      
      toast({
        title: "Status Updated",
        description: `Assignment marked as ${status.replace('-', ' ')}`,
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
      // First check if the assignment can be cleared (only pending status)
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
    
    // If only start date is selected, match only that day
    const startDay = startOfDay(start);
    const endDay = endOfDay(start);
    return isWithinInterval(assignmentDate, { start: startDay, end: endDay });
  };
  
  // Apply all filters (status and date)
  const filteredAssignments = assignments
    .filter(assignment => filter === 'all' || assignment.status === filter)
    .filter(isWithinDateRange);

  const toggleExpandAssignment = (id: string) => {
    setExpandedAssignment(expandedAssignment === id ? null : id);
  };

  const handlePrint = () => {
    const content = printRef.current;
    
    if (!content) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast({
        title: "Print Error",
        description: "Unable to open print window. Please check your browser settings.",
        variant: "destructive"
      });
      return;
    }
    
    // Create date range text for header
    let dateRangeText = 'All Dates';
    if (dateRange?.from) {
      dateRangeText = dateRange.to 
        ? `${format(dateRange.from, 'MMM dd, yyyy')} to ${format(dateRange.to, 'MMM dd, yyyy')}` 
        : format(dateRange.from, 'MMM dd, yyyy');
    }
    
    // Create status filter text
    const statusText = filter === 'all' ? 'All Statuses' : `Status: ${filter.replace('-', ' ')}`;
    
    // Create HTML content for printing
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

                    ${assignment.photo_url && photoUrls[assignment.id] ? 
                      `<div class="photo-container">
                        <img src="${photoUrls[assignment.id]}" alt="Assignment photo" />
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
    
    // Give time for content to load before printing
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
                      <TableRow key={assignment.id}>
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
                              onClick={() => toggleExpandAssignment(assignment.id)}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (photoUrls[assignment.id]) {
                                  window.open(photoUrls[assignment.id], '_blank');
                                }
                              }}
                              className="flex items-center gap-1 text-sm"
                            >
                              <ImageIcon className="h-4 w-4" />
                              View Photo
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">No photo</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
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
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateAssignmentStatus(assignment.id, 'done')}
                                className="bg-green-50 hover:bg-green-100 text-green-600"
                              >
                                Complete
                              </Button>
                            )}
                            {assignment.status !== 'incomplete' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateAssignmentStatus(assignment.id, 'incomplete')}
                                className="bg-red-50 hover:bg-red-100 text-red-600"
                              >
                                Incomplete
                              </Button>
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
                            {assignment.photo_url && photoUrls[assignment.id] && (
                              <div className="mt-3 max-w-md">
                                <AspectRatio ratio={4/3} className="bg-muted">
                                  <img
                                    src={photoUrls[assignment.id]}
                                    alt="Assignment photo"
                                    className="rounded-md object-cover w-full h-full"
                                  />
                                </AspectRatio>
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
