import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
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
  isPreviousDay?: boolean;
}

interface IncompleteAssignmentsCarouselProps {
  assignments: Assignment[];
}

const IncompleteAssignmentsCarousel = ({ assignments }: IncompleteAssignmentsCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  if (assignments.length === 0) {
    return null;
  }

  const nextAssignment = () => {
    setCurrentIndex((prev) => (prev + 1) % assignments.length);
  };

  const prevAssignment = () => {
    setCurrentIndex((prev) => (prev - 1 + assignments.length) % assignments.length);
  };

  const currentAssignment = assignments[currentIndex];

  const handleCardClick = () => {
    if (currentAssignment.id) {
      navigate(`/assignments?id=${currentAssignment.id}`);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">
          Incomplete Assignments ({assignments.length})
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevAssignment}
            disabled={assignments.length <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-gray-500">
            {currentIndex + 1} / {assignments.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={nextAssignment}
            disabled={assignments.length <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div onClick={handleCardClick} className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]">
        <Card className={`${currentAssignment.isPreviousDay ? 'border-amber-500 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{currentAssignment.area}</h4>
                  {currentAssignment.isPreviousDay && (
                    <Badge variant="outline" className="text-xs text-amber-700 bg-amber-100 border-amber-200">
                      From yesterday
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                  <User className="h-3 w-3" />
                  <span>{currentAssignment.assignee_name}</span>
                </div>
                {currentAssignment.instructions && (
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {currentAssignment.instructions}
                  </p>
                )}
                <div className="mt-1">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      currentAssignment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      currentAssignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {currentAssignment.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IncompleteAssignmentsCarousel;
