
import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { User, Lightbulb, Search } from 'lucide-react';

interface AssigneeSelectProps {
  value: string;
  onChange: (value: string) => void;
  assignees: { id: string; name: string }[];
}

const AssigneeSelect: React.FC<AssigneeSelectProps> = ({ value, onChange, assignees }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredAssignees = assignees.filter(assignee =>
    assignee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedAssignee = assignees.find(assignee => assignee.id === value);

  return (
    <div className="flex items-center gap-2 mb-4">
      <User className="h-5 w-5 text-gray-500" />
      <div className="relative w-full">
        <button
          type="button"
          className="w-full p-2 border rounded flex justify-between items-center text-left"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="truncate">
            {selectedAssignee ? (
              <div className="flex items-center gap-2">
                {selectedAssignee.name === 'Self Initiative' && (
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                )}
                <span className={selectedAssignee.name === 'Self Initiative' ? 'text-amber-600 font-medium' : ''}>
                  {selectedAssignee.name}
                </span>
              </div>
            ) : (
              "Assign to..."
            )}
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
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none max-h-60 overflow-auto">
            <div className="px-2 py-1 sticky top-0 bg-white border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search assignees..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            {filteredAssignees.length === 0 ? (
              <div className="px-4 py-2 text-gray-500">No assignees found</div>
            ) : (
              filteredAssignees.map((assignee) => (
                <button
                  key={assignee.id}
                  type="button"
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                    value === assignee.id ? "bg-gray-100 font-medium" : ""
                  }`}
                  onClick={() => {
                    onChange(assignee.id);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                >
                  {assignee.name === 'Self Initiative' && (
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                  )}
                  <span className={assignee.name === 'Self Initiative' ? 'text-amber-600 font-medium' : ''}>
                    {assignee.name}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssigneeSelect;
