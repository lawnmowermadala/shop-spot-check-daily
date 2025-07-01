
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Lightbulb } from 'lucide-react';

interface AssigneeSelectProps {
  value: string;
  onChange: (value: string) => void;
  assignees: { id: string; name: string }[];
}

const AssigneeSelect: React.FC<AssigneeSelectProps> = ({ value, onChange, assignees }) => {
  const selectedAssignee = assignees.find(assignee => assignee.id === value);

  // Prepare items for searchable select
  const assigneeItems = assignees.map(assignee => ({
    id: assignee.id,
    value: assignee.id,
    label: assignee.name,
    name: assignee.name,
    searchTerms: assignee.name.toLowerCase()
  }));

  return (
    <div className="flex items-center gap-2 mb-4">
      <User className="h-5 w-5 text-gray-500" />
      <div className="w-full">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue 
              placeholder="Type to search assignees..."
            >
              {selectedAssignee ? (
                <div className="flex items-center gap-2">
                  {selectedAssignee.name === 'Self Initiative' && (
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                  )}
                  <span className={selectedAssignee.name === 'Self Initiative' ? 'text-amber-600 font-medium' : ''}>
                    {selectedAssignee.name}
                  </span>
                </div>
              ) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent items={assigneeItems} searchable={true} />
        </Select>
      </div>
    </div>
  );
};

export default AssigneeSelect;
