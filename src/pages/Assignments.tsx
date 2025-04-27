
import { useState, useEffect } from 'react';
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
import { Check, Clock, CirclePlay } from 'lucide-react';
import Navigation from '@/components/Navigation';

type Assignment = {
  id: string;
  area: string;
  assignee: string;
  status: 'needs-check' | 'in-progress' | 'done';
  assignedDate: string;
}

const statusIcons = {
  'needs-check': <CirclePlay className="h-5 w-5 text-yellow-500" />,
  'in-progress': <Clock className="h-5 w-5 text-blue-500" />,
  'done': <Check className="h-5 w-5 text-green-500" />
};

const Assignments = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState<'all' | 'needs-check' | 'in-progress' | 'done'>('all');

  useEffect(() => {
    // In a real app, this would fetch data from a backend
    // For now, we'll mock some data
    const storedAssignments = localStorage.getItem('assignments');
    if (storedAssignments) {
      setAssignments(JSON.parse(storedAssignments));
    }
  }, []);
  
  const filteredAssignments = filter === 'all' 
    ? assignments 
    : assignments.filter(assignment => assignment.status === filter);

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Job Assignments</h1>
      
      <div className="flex flex-wrap gap-2 mb-6">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          onClick={() => setFilter('all')}
          size="sm"
        >
          All
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length > 0 ? (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.area}</TableCell>
                      <TableCell>{assignment.assignee}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusIcons[assignment.status]}
                          <span className="capitalize">
                            {assignment.status.replace('-', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{assignment.assignedDate}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No assignments found
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
