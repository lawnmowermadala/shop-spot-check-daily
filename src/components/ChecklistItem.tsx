
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ClipboardCheck } from 'lucide-react';

interface ChecklistItemProps {
  area: string;
  description: string;
  assignees: Array<{ id: string; name: string }>;
  onAssign: (assigneeId: string) => void;
  isAssigned: boolean;
}

const ChecklistItem = ({ 
  area, 
  description, 
  assignees: propAssignees, 
  onAssign, 
  isAssigned 
}: ChecklistItemProps) => {
  const [showAssignees, setShowAssignees] = useState(false);
  const [localAssignees, setLocalAssignees] = useState<Array<{ id: string; name: string }>>([]);
  
  // Get assignees from localStorage if not provided via props
  useEffect(() => {
    if (propAssignees && propAssignees.length > 0) {
      setLocalAssignees(propAssignees);
    } else {
      const storedStaff = localStorage.getItem('staffMembers');
      if (storedStaff) {
        setLocalAssignees(JSON.parse(storedStaff));
      }
    }
  }, [propAssignees]);

  return (
    <Card className={isAssigned ? "border-green-500" : ""}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg">{area}</h3>
            <p className="text-gray-600">{description}</p>
          </div>
          
          {isAssigned ? (
            <Button variant="outline" className="bg-green-50" disabled>
              <Check className="h-4 w-4 mr-2 text-green-500" />
              Assigned
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => setShowAssignees(!showAssignees)}
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Assign
            </Button>
          )}
        </div>
        
        {showAssignees && !isAssigned && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {localAssignees.length > 0 ? (
              localAssignees.map(assignee => (
                <Button 
                  key={assignee.id} 
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    onAssign(assignee.id);
                    setShowAssignees(false);
                  }}
                >
                  {assignee.name}
                </Button>
              ))
            ) : (
              <p className="text-sm text-gray-500 col-span-2">
                No staff members available. Add staff members first.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChecklistItem;
