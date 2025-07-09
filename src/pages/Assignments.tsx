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

// ... (keep all your existing types and statusIcons constant)

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

// ... (keep all your existing Assignments component code until the return statement)

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Job Assignments</h1>
      
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {/* ... (keep your existing filter buttons) ... */}
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

      {/* ... (keep the rest of your component) ... */}
    </div>
  );
};

export default Assignments;
