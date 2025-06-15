
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
  return (
    <div className="flex items-center gap-2 mb-4">
      <User className="h-5 w-5 text-gray-500" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Assign to..." />
        </SelectTrigger>
        <SelectContent>
          {assignees.map((assignee) => (
            <SelectItem key={assignee.id} value={assignee.id}>
              <div className="flex items-center gap-2">
                {assignee.name === 'Self Initiative' && (
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                )}
                <span className={assignee.name === 'Self Initiative' ? 'text-amber-600 font-medium' : ''}>
                  {assignee.name}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AssigneeSelect;
